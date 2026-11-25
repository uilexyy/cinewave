import { isIP } from "net";

export function isPrivateIp(ip: string): boolean {
  // Strip IPv6 zone ID (e.g., fe80::1%eth0)
  const cleanIp = ip.split("%")[0];

  // Handle IPv4-mapped IPv6 addresses (::ffff:1.2.3.4)
  let normalizedIp = cleanIp;
  const v4MappedMatch = cleanIp.match(/^::ffff:(.+)$/i);
  if (v4MappedMatch) {
    normalizedIp = v4MappedMatch[1];
  }

  if (isIP(normalizedIp) === 0) return false;

  // IPv4 checks
  if (isIP(normalizedIp) === 4) {
    const parts = normalizedIp.split(".").map(Number);
    if (parts.length !== 4) return false;

    // 0.0.0.0/8 (unspecified / "this" network)
    if (parts[0] === 0) return true;
    // 10.0.0.0/8 (private)
    if (parts[0] === 10) return true;
    // 127.0.0.0/8 (loopback)
    if (parts[0] === 127) return true;
    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) return true;
    // 172.16.0.0/12 (private)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    // 192.168.0.0/16 (private)
    if (parts[0] === 192 && parts[1] === 168) return true;
    // 224.0.0.0/4 (multicast)
    if (parts[0] >= 224 && parts[0] <= 239) return true;
    // 240.0.0.0/4 (reserved)
    if (parts[0] >= 240) return true;
    // 255.255.255.255 (broadcast)
    if (parts[0] === 255 && parts[1] === 255 && parts[2] === 255 && parts[3] === 255) return true;

    return false;
  }

  // IPv6 checks
  if (isIP(normalizedIp) === 6) {
    const lower = normalizedIp.toLowerCase();
    // ::1 (loopback)
    if (lower === "::1") return true;
    // :: (unspecified)
    if (lower === "::") return true;
    // fc00::/7 (unique local)
    if (lower.startsWith("fc") || lower.startsWith("fd")) return true;
    // fe80::/10 (link-local)
    if (lower.startsWith("fe8") || lower.startsWith("fe9") || lower.startsWith("fea") || lower.startsWith("feb")) return true;
    // ff00::/8 (multicast)
    if (lower.startsWith("ff")) return true;

    return false;
  }

  return false;
}

export function isBlockedHost(hostname: string): boolean {
  // Strip brackets from IPv6 (e.g., [::1] -> ::1)
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (lower === "localhost" || lower === "127.0.0.1" || lower === "::1") {
    return true;
  }
  return isPrivateIp(lower);
}

export async function resolveAndValidateHost(
  hostname: string
): Promise<{ ip: string; blocked: boolean; addresses: string[] }> {
  const dns = await import("dns");
  const { lookup } = dns.promises;

  try {
    const result = await lookup(hostname, { all: true });
    const addresses = Array.isArray(result) ? result : [result];
    const ips = addresses.map((a) => a.address);

    // Check ALL resolved IPs, not just the first one
    const anyBlocked = ips.some((ip) => isPrivateIp(ip));
    return { ip: ips[0] || "", blocked: anyBlocked, addresses: ips };
  } catch {
    return { ip: "", blocked: true, addresses: [] };
  }
}

export async function safeFetch(
  url: string,
  timeout = 10000,
  maxRedirects = 5
): Promise<{ ok: boolean; status: number; body: string; error?: string }> {
  let currentUrl = url;
  let redirects = 0;

  while (redirects <= maxRedirects) {
    let parsed: URL;
    try {
      parsed = new URL(currentUrl);
    } catch {
      return { ok: false, status: 0, body: "", error: "Invalid URL" };
    }

    // Protocol validation
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return { ok: false, status: 0, body: "", error: "Invalid protocol" };
    }

    // Hostname validation (fast-path check)
    if (isBlockedHost(parsed.hostname)) {
      return { ok: false, status: 0, body: "", error: "Blocked host (private IP or localhost)" };
    }

    // DNS resolution validation (DNS rebinding protection)
    const { blocked, addresses } = await resolveAndValidateHost(parsed.hostname);
    if (blocked) {
      return {
        ok: false,
        status: 0,
        body: "",
        error: `DNS resolution points to private IP${addresses.length ? ` (${addresses.join(", ")})` : ""}`,
      };
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);

    try {
      const res = await fetch(currentUrl, {
        signal: controller.signal,
        redirect: "manual",
      });
      clearTimeout(timer);

      // Handle redirects manually
      if (res.status >= 300 && res.status < 400) {
        const location = res.headers.get("location");
        if (!location) {
          return { ok: false, status: res.status, body: "", error: "Redirect without location header" };
        }

        // Resolve relative redirect URLs
        let nextUrl: string;
        try {
          nextUrl = new URL(location, currentUrl).toString();
        } catch {
          return { ok: false, status: 0, body: "", error: "Invalid redirect URL" };
        }

        // Validate redirect protocol
        const redirectParsed = new URL(nextUrl);
        if (redirectParsed.protocol !== "https:" && redirectParsed.protocol !== "http:") {
          return { ok: false, status: 0, body: "", error: "Redirect to non-HTTP protocol blocked" };
        }

        redirects++;
        if (redirects > maxRedirects) {
          return { ok: false, status: 0, body: "", error: "Too many redirects" };
        }

        currentUrl = nextUrl;
        continue;
      }

      // Read body with size limit
      const body = await res.text();
      if (body.length > 1024 * 1024) {
        return { ok: false, status: 413, body: "", error: "Response too large (max 1MB)" };
      }

      return { ok: res.ok, status: res.status, body };
    } catch (err) {
      clearTimeout(timer);
      const message = (err as Error).message;
      if (message.includes("abort")) {
        return { ok: false, status: 0, body: "", error: "Request timeout" };
      }
      return { ok: false, status: 0, body: "", error: message };
    }
  }

  return { ok: false, status: 0, body: "", error: "Too many redirects" };
}
