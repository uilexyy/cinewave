import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { isBlockedHost, resolveAndValidateHost } from "@/lib/ssrf-guard";

type StreamStatus = "ONLINE" | "OFFLINE" | "CHECKING" | "UNKNOWN" | "INVALID";

interface StatusResult {
  url: string;
  status: StreamStatus;
  httpStatus?: number;
  error?: string;
}

const TIMEOUT_MS = 8000;
const MAX_URLS = 10;
const CONCURRENCY = 3;

async function checkOneUrl(rawUrl: string): Promise<StatusResult> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { url: rawUrl, status: "INVALID", error: "Invalid URL" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { url: rawUrl, status: "INVALID", error: "Unsupported protocol" };
  }
  if (isBlockedHost(parsed.hostname)) {
    return { url: rawUrl, status: "INVALID", error: "Blocked host" };
  }
  const { blocked } = await resolveAndValidateHost(parsed.hostname);
  if (blocked) {
    return { url: rawUrl, status: "INVALID", error: "DNS points to private IP" };
  }

  const isHls = /\.m3u8(\?|$)/i.test(rawUrl);

  async function probe(url: string, method: "HEAD" | "GET", range?: string): Promise<{ ok: boolean; status: number; error?: string; body?: string }> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
    try {
      const headers: Record<string, string> = {};
      if (range) headers["Range"] = range;
      const res = await fetch(url, {
        method,
        headers,
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timer);
      if (res.status >= 300 && res.status < 400) {
        const loc = res.headers.get("location");
        if (loc) {
          try {
            const next = new URL(loc, url).toString();
            const np = new URL(next);
            if (np.protocol !== "http:" && np.protocol !== "https:") {
              return { ok: false, status: 0, error: "Bad redirect protocol" };
            }
            if (isBlockedHost(np.hostname)) {
              return { ok: false, status: 0, error: "Redirect to blocked host" };
            }
            const { blocked: rb } = await resolveAndValidateHost(np.hostname);
            if (rb) return { ok: false, status: 0, error: "Redirect to private IP" };
            return probe(next, method, range);
          } catch {
            return { ok: false, status: 0, error: "Bad redirect" };
          }
        }
        return { ok: false, status: res.status, error: "Redirect without location" };
      }
      let body: string | undefined;
      if (method === "GET") {
        try {
          const reader = res.body?.getReader();
          if (reader) {
            const { value } = await reader.read();
            if (value) body = new TextDecoder().decode(value).slice(0, 256 * 1024);
            reader.cancel().catch(() => {});
          }
        } catch {
          // ignore
        }
      }
      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      clearTimeout(timer);
      const msg = (err as Error).message || "";
      if (msg.includes("abort")) return { ok: false, status: 0, error: "Timeout" };
      return { ok: false, status: 0, error: msg || "Network error" };
    }
  }

  if (isHls) {
    const pl = await probe(rawUrl, "GET");
    if (!pl.ok) {
      if (pl.status === 403 || pl.status === 404 || pl.status >= 500) {
        return { url: rawUrl, status: "OFFLINE", httpStatus: pl.status, error: `HTTP ${pl.status}` };
      }
      return { url: rawUrl, status: "UNKNOWN", httpStatus: pl.status, error: pl.error || "Playlist fetch failed" };
    }
    const body = pl.body || "";
    if (!body.includes("#EXTM3U")) {
      return { url: rawUrl, status: "UNKNOWN", httpStatus: pl.status, error: "Invalid playlist" };
    }
    const lines = body.split(/\r?\n/);
    let segmentUrl: string | null = null;
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      try {
        segmentUrl = new URL(trimmed, rawUrl).toString();
        break;
      } catch {
        continue;
      }
    }
    if (!segmentUrl) {
      return { url: rawUrl, status: "ONLINE", httpStatus: pl.status };
    }
    try {
      const sp = new URL(segmentUrl);
      if (isBlockedHost(sp.hostname)) {
        return { url: rawUrl, status: "OFFLINE", error: "Segment host blocked" };
      }
      const { blocked: sb } = await resolveAndValidateHost(sp.hostname);
      if (sb) return { url: rawUrl, status: "OFFLINE", error: "Segment DNS blocked" };
    } catch {
      return { url: rawUrl, status: "UNKNOWN", error: "Bad segment URL" };
    }
    const seg = await probe(segmentUrl, "HEAD");
    if (seg.ok) return { url: rawUrl, status: "ONLINE", httpStatus: seg.status };
    if (seg.status === 405 || seg.status === 501 || seg.status === 403) {
      const segGet = await probe(segmentUrl, "GET", "bytes=0-0");
      if (segGet.ok || segGet.status === 206) return { url: rawUrl, status: "ONLINE", httpStatus: segGet.status };
      if (segGet.status === 403 || segGet.status === 404 || segGet.status >= 500) {
        return { url: rawUrl, status: "OFFLINE", httpStatus: segGet.status, error: `HTTP ${segGet.status}` };
      }
      return { url: rawUrl, status: "UNKNOWN", httpStatus: segGet.status, error: segGet.error || "Inconclusive" };
    }
    if (seg.status === 403 || seg.status === 404 || seg.status >= 500) {
      return { url: rawUrl, status: "OFFLINE", httpStatus: seg.status, error: `HTTP ${seg.status}` };
    }
    if (seg.status === 0) {
      return { url: rawUrl, status: "UNKNOWN", error: seg.error || "Segment check failed" };
    }
    return { url: rawUrl, status: "UNKNOWN", httpStatus: seg.status, error: seg.error };
  }

  const head = await probe(rawUrl, "HEAD");
  if (head.ok) return { url: rawUrl, status: "ONLINE", httpStatus: head.status };
  if (head.status === 405 || head.status === 501) {
    const get = await probe(rawUrl, "GET", "bytes=0-0");
    if (get.ok || get.status === 206) return { url: rawUrl, status: "ONLINE", httpStatus: get.status };
    if (get.status === 403 || get.status === 404 || get.status >= 500) {
      return { url: rawUrl, status: "OFFLINE", httpStatus: get.status, error: `HTTP ${get.status}` };
    }
    return { url: rawUrl, status: "UNKNOWN", httpStatus: get.status, error: get.error || "Inconclusive" };
  }
  if (head.status === 403 || head.status === 404 || head.status >= 500) {
    return { url: rawUrl, status: "OFFLINE", httpStatus: head.status, error: `HTTP ${head.status}` };
  }
  if (head.status === 0) {
    return { url: rawUrl, status: "UNKNOWN", error: head.error || "Connectivity check inconclusive" };
  }
  return { url: rawUrl, status: "UNKNOWN", httpStatus: head.status, error: head.error };
}

async function runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
  const results: T[] = new Array(tasks.length);
  let idx = 0;
  async function worker() {
    while (idx < tasks.length) {
      const i = idx++;
      results[i] = await tasks[i]();
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, () => worker()));
  return results;
}

export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;
  const rl = await enforceRateLimit(req, RATE_LIMITS.playback, user?.id ?? null);
  if (rl) return rl;
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  let body: { urls?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON" }, { status: 400 });
  }
  const urls = Array.isArray(body?.urls) ? body.urls.filter((u): u is string => typeof u === "string") : [];
  if (urls.length === 0) {
    return NextResponse.json({ success: false, message: "Missing urls" }, { status: 400 });
  }
  const unique = Array.from(new Set(urls)).slice(0, MAX_URLS);

  const tasks = unique.map((u) => () => checkOneUrl(u));
  const results = await runWithConcurrency(tasks, CONCURRENCY);

  return NextResponse.json({ success: true, data: { statuses: results } });
}