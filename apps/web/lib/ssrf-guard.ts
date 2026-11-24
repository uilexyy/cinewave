import { isIP } from "net";

const PRIVATE_IP_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

export function isPrivateIp(ip: string): boolean {
  if (isIP(ip) === 0) return false;
  return PRIVATE_IP_RANGES.some((re) => re.test(ip));
}

export function isBlockedHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") {
    return true;
  }
  return isPrivateIp(lower);
}

export async function resolveAndValidateHost(
  hostname: string
): Promise<{ ip: string; blocked: boolean }> {
  const dns = await import("dns");
  const { lookup } = dns.promises;

  try {
    const result = await lookup(hostname);
    return { ip: result.address, blocked: isPrivateIp(result.address) };
  } catch {
    return { ip: "", blocked: true };
  }
}

export async function safeFetch(
  url: string,
  timeout = 10000
): Promise<{ ok: boolean; status: number; body: string; error?: string }> {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, status: 0, body: "", error: "Invalid protocol" };
  }

  if (isBlockedHost(parsed.hostname)) {
    return { ok: false, status: 0, body: "", error: "Blocked host (private IP)" };
  }

  const { blocked } = await resolveAndValidateHost(parsed.hostname);
  if (blocked) {
    return { ok: false, status: 0, body: "", error: "DNS resolution points to private IP" };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.text();
    clearTimeout(timer);

    if (body.length > 1024 * 1024) {
      return { ok: false, status: 413, body: "", error: "Response too large (max 1MB)" };
    }

    return { ok: res.ok, status: res.status, body };
  } catch (err) {
    clearTimeout(timer);
    return { ok: false, status: 0, body: "", error: (err as Error).message };
  }
}
