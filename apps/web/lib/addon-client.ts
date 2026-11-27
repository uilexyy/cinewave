import { safeFetch, isBlockedHost } from "./ssrf-guard";

import { AddonManifest } from "./addon-service";
export type { AddonManifest };

export interface AddonValidationResult {
  valid: boolean;
  manifest?: AddonManifest;
  errors: string[];
  warnings: string[];
}

export interface AddonCatalogItem {
  id: string;
  type: string;
  name: string;
  poster?: string;
  posterShape?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  runtime?: string;
  app_extras?: { ratings?: { imdb?: { rating?: string; votes?: number | string } } };
}

export interface AddonMeta {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  runtime?: string;
  cast?: string[];
  director?: string[];
  videos?: Array<{ id: string; title: string; season?: number; episode?: number; released?: string; thumbnail?: string }>;
  app_extras?: { ratings?: { imdb?: { rating?: string; votes?: number | string } } };
}

export interface AddonStream {
  url?: string;
  ytId?: string;
  infoHash?: string;
  externalUrl?: string;
  name?: string;
  title?: string;
  description?: string;
  behaviorHints?: Record<string, unknown>;
}

export interface AddonSubtitle {
  id?: string;
  url: string;
  lang: string;
}

export interface PlaybackSubtitle {
  id: string;
  language?: string;
  format: "vtt";
  url?: string;
  content?: string;
  source?: string;
}

function getBaseUrl(manifestUrl: string): string {
  return manifestUrl.replace(/\/manifest\.json$/i, "").replace(/\/$/, "");
}

function manifestSupports(manifest: AddonManifest, resource: string, type?: string): boolean {
  const resources = (manifest.resources || []);
  for (const r of resources) {
    if (typeof r === "string") {
      if (r === resource) {
        if (!type) return true;
        return (manifest.types || []).includes(type);
      }
    } else if (r.name === resource) {
      if (!type) return true;
      if (r.types && r.types.length > 0) return r.types.includes(type);
      return (manifest.types || []).includes(type);
    }
  }
  return false;
}

async function fetchJson(url: string): Promise<{ ok: boolean; data?: Record<string, unknown>; error?: string }> {
  try {
    const host = new URL(url).hostname;
    if (isBlockedHost(host)) return { ok: false, error: "Blocked host" };
  } catch {
    return { ok: false, error: "Invalid URL" };
  }
  const res = await safeFetch(url, 10000);
  if (!res.ok) return { ok: false, error: res.error || `HTTP ${res.status}` };
  try {
    return { ok: true, data: JSON.parse(res.body) };
  } catch {
    return { ok: false, error: "Invalid JSON" };
  }
}

export async function fetchAddonCatalog(
  manifestUrl: string,
  manifest: AddonManifest,
  type: string,
  id: string,
  extra: Record<string, string> = {}
): Promise<AddonCatalogItem[]> {
  if (!manifestSupports(manifest, "catalog", type)) return [];
  const base = getBaseUrl(manifestUrl);
  const extraParts = Object.entries(extra)
    .filter(([, v]) => v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  const extraStr = extraParts.length ? `/${extraParts.join("&")}` : "";
  const url = `${base}/catalog/${encodeURIComponent(type)}/${encodeURIComponent(id)}${extraStr}.json`;
  const res = await fetchJson(url);
  if (!res.ok) return [];
  const metas = res.data?.metas as AddonCatalogItem[] | undefined;
  return Array.isArray(metas) ? metas : [];
}

export async function fetchAddonMeta(
  manifestUrl: string,
  manifest: AddonManifest,
  type: string,
  id: string
): Promise<AddonMeta | null> {
  if (!manifestSupports(manifest, "meta", type)) return null;
  const base = getBaseUrl(manifestUrl);
  const url = `${base}/meta/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
  const res = await fetchJson(url);
  if (!res.ok) return null;
  return (res.data?.meta as AddonMeta | undefined) ?? null;
}

export async function fetchAddonStreams(
  manifestUrl: string,
  manifest: AddonManifest,
  type: string,
  id: string
): Promise<AddonStream[]> {
  if (!manifestSupports(manifest, "stream", type)) return [];
  const base = getBaseUrl(manifestUrl);
  const url = `${base}/stream/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
  const res = await fetchJson(url);
  if (!res.ok) return [];
  const streams = res.data?.streams as AddonStream[] | undefined;
  return Array.isArray(streams) ? streams : [];
}

export async function fetchAddonSubtitles(
  manifestUrl: string,
  manifest: AddonManifest,
  type: string,
  id: string
): Promise<AddonSubtitle[]> {
  if (!manifestSupports(manifest, "subtitles", type)) return [];
  const base = getBaseUrl(manifestUrl);
  const url = `${base}/subtitles/${encodeURIComponent(type)}/${encodeURIComponent(id)}.json`;
  const res = await fetchJson(url);
  if (!res.ok) return [];
  const subs = res.data?.subtitles as AddonSubtitle[] | undefined;
  return Array.isArray(subs) ? subs : [];
}

export function isSafeStream(stream: AddonStream): boolean {
  if (stream.url) {
    try {
      const u = new URL(stream.url);
      if (u.protocol !== "https:" && u.protocol !== "http:") return false;
      if (isBlockedHost(u.hostname)) return false;
      return true;
    } catch {
      return false;
    }
  }
  return false;
}

export function getStreamPlayableUrl(stream: AddonStream): string | null {
  if (stream.url && isSafeStream(stream)) return stream.url;
  return null;
}

const MAX_SUBTITLE_BYTES = 1024 * 1024;

export function isSafeSubtitleUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    if (isBlockedHost(u.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

/** Convert SRT cue numbering/timestamps to WebVTT. Idempotent for VTT. */
export function toWebVtt(raw: string): string {
  const text = raw.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n").trim();
  if (/^WEBVTT\b/m.test(text)) return text;
  const vtt = text
    .replace(/^\d+\s*\n/gm, "")
    .replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
  return `WEBVTT\n\n${vtt}\n`;
}

/**
 * Fetch subtitle body server-side, enforce size limit, and normalise SRT to VTT.
 * Never returns raw third-party errors to the client.
 */
export async function fetchSubtitleContent(
  url: string
): Promise<{ content: string; format: "vtt" } | { error: string }> {
  if (!isSafeSubtitleUrl(url)) return { error: "invalid-url" };
  const res = await safeFetch(url, 10000, 5);
  if (!res.ok) return { error: res.error || `HTTP ${res.status}` };
  if (res.body.length > MAX_SUBTITLE_BYTES) return { error: "too-large" };
  if (!res.body.trim()) return { error: "empty" };
  return { content: toWebVtt(res.body), format: "vtt" };
}
