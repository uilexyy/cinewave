import assert from "node:assert/strict";
import { safeFetch, isPrivateIp, isBlockedHost } from "../lib/ssrf-guard";

async function runTests() {
  console.log("Starting SSRF Redirect Tests...");

  // === isPrivateIp tests ===
  console.log("\n--- isPrivateIp ---");
  assert.equal(isPrivateIp("127.0.0.1"), true, "127.0.0.1 should be private");
  assert.equal(isPrivateIp("10.0.0.1"), true, "10.x should be private");
  assert.equal(isPrivateIp("172.16.0.1"), true, "172.16.x should be private");
  assert.equal(isPrivateIp("172.31.255.255"), true, "172.31.x should be private");
  assert.equal(isPrivateIp("192.168.1.1"), true, "192.168.x should be private");
  assert.equal(isPrivateIp("169.254.1.1"), true, "169.254.x should be private");
  assert.equal(isPrivateIp("8.8.8.8"), false, "8.8.8.8 should be public");
  assert.equal(isPrivateIp("1.1.1.1"), false, "1.1.1.1 should be public");
  assert.equal(isPrivateIp("::1"), true, "::1 should be private");
  assert.equal(isPrivateIp("::ffff:127.0.0.1"), true, "IPv4-mapped loopback should be private");
  assert.equal(isPrivateIp("::ffff:10.0.0.1"), true, "IPv4-mapped private should be private");
  assert.equal(isPrivateIp("::ffff:8.8.8.8"), false, "IPv4-mapped public should be public");
  assert.equal(isPrivateIp("ff02::1"), true, "multicast IPv6 should be private");
  assert.equal(isPrivateIp("fc00::1"), true, "fc00::/7 should be private");
  assert.equal(isPrivateIp("fd00::1"), true, "fd00::/8 should be private");
  assert.equal(isPrivateIp("fe80::1"), true, "fe80::/10 should be private");
  assert.equal(isPrivateIp("224.0.0.1"), true, "multicast IPv4 should be private");
  assert.equal(isPrivateIp("240.0.0.1"), true, "reserved IPv4 should be private");
  assert.equal(isPrivateIp("0.0.0.0"), true, "unspecified should be private");
  assert.equal(isPrivateIp("255.255.255.255"), true, "broadcast should be private");
  console.log("PASS: isPrivateIp comprehensive checks");

  // === isBlockedHost tests ===
  console.log("\n--- isBlockedHost ---");
  assert.equal(isBlockedHost("localhost"), true, "localhost should be blocked");
  assert.equal(isBlockedHost("127.0.0.1"), true, "127.0.0.1 should be blocked");
  assert.equal(isBlockedHost("[::1]"), true, "[::1] should be blocked");
  assert.equal(isBlockedHost("10.0.0.5"), true, "private IP host should be blocked");
  assert.equal(isBlockedHost("example.com"), false, "example.com should not be blocked");
  console.log("PASS: isBlockedHost checks");

  // === safeFetch with mocked fetch ===
  console.log("\n--- safeFetch redirect/protocol/size/timeout ---");

  const originalFetch = globalThis.fetch;
  const originalLookup = (await import("node:dns")).promises.lookup;

  // Mock DNS lookup to return public IP for example.com
  const dns = await import("node:dns");
  (dns.promises as { lookup: (hostname: string, opts?: { all?: boolean }) => Promise<unknown> }).lookup = async (hostname: string, opts?: { all?: boolean }) => {
    if (hostname === "example.com" || hostname === "safe.example.com" || hostname === "redirect.example.com") {
      if (opts?.all) return [{ address: "93.184.216.34", family: 4 }];
      return { address: "93.184.216.34", family: 4 };
    }
    if (hostname === "evil.example.com") {
      if (opts?.all) return [{ address: "127.0.0.1", family: 4 }];
      return { address: "127.0.0.1", family: 4 };
    }
    if (hostname === "localhost") {
      if (opts?.all) return [{ address: "127.0.0.1", family: 4 }];
      return { address: "127.0.0.1", family: 4 };
    }
    // Default: public
    if (opts?.all) return [{ address: "93.184.216.34", family: 4 }];
    return { address: "93.184.216.34", family: 4 };
  };

  let fetchCalls: string[] = [];
  type MockFetch = (input: string | { url: string }, init?: { signal?: AbortSignal }) => Promise<Response>;
  (globalThis as unknown as { fetch: MockFetch }).fetch = async (input: string | { url: string }, init?: { signal?: AbortSignal }) => {
    const url = typeof input === "string" ? input : input.url;
    fetchCalls.push(url);

    if (url === "https://example.com/redirect-to-localhost") {
      return new Response(null, { status: 302, headers: { location: "http://127.0.0.1:9999/secret" } });
    }
    if (url === "https://example.com/redirect-to-private") {
      return new Response(null, { status: 302, headers: { location: "http://192.168.1.1/internal" } });
    }
    if (url === "https://example.com/redirect-chain-1") {
      return new Response(null, { status: 302, headers: { location: "https://example.com/redirect-chain-2" } });
    }
    if (url === "https://example.com/redirect-chain-2") {
      return new Response(null, { status: 302, headers: { location: "https://example.com/redirect-chain-3" } });
    }
    if (url === "https://example.com/redirect-chain-3") {
      return new Response(null, { status: 302, headers: { location: "https://example.com/redirect-chain-4" } });
    }
    if (url === "https://example.com/redirect-chain-4") {
      return new Response(null, { status: 302, headers: { location: "https://example.com/redirect-chain-5" } });
    }
    if (url === "https://example.com/redirect-chain-5") {
      return new Response(null, { status: 302, headers: { location: "https://example.com/redirect-chain-6" } });
    }
    if (url === "https://example.com/redirect-chain-6") {
      return new Response(null, { status: 302, headers: { location: "https://example.com/final" } });
    }
    if (url === "https://example.com/redirect-to-http") {
      return new Response(null, { status: 302, headers: { location: "http://example.com/final" } });
    }
    if (url === "https://example.com/redirect-to-non-http") {
      return new Response(null, { status: 302, headers: { location: "ftp://example.com/file" } });
    }
    if (url === "https://example.com/redirect-no-location") {
      return new Response(null, { status: 302 });
    }
    if (url === "http://example.com/final" || url === "https://example.com/final") {
      return new Response("OK", { status: 200 });
    }
    if (url === "https://example.com/large") {
      return new Response("x".repeat(1024 * 1024 + 100), { status: 200 });
    }
    if (url === "https://example.com/slow") {
      return new Promise((_, reject) => {
        const signal = init?.signal;
        if (signal) {
          signal.addEventListener("abort", () => reject(new Error("The operation was aborted")));
        }
      });
    }
    return new Response("Not found", { status: 404 });
  };

  try {
    // Redirect to localhost blocked
    fetchCalls = [];
    const r1 = await safeFetch("https://example.com/redirect-to-localhost", 5000);
    assert.equal(r1.ok, false, "Redirect to localhost should be blocked");
    assert.ok(!fetchCalls.includes("http://127.0.0.1:9999/secret"), "Should not fetch localhost target");
    console.log(`PASS: Redirect to localhost blocked (${r1.error})`);

    // Redirect to private IP blocked
    fetchCalls = [];
    const r2 = await safeFetch("https://example.com/redirect-to-private", 5000);
    assert.equal(r2.ok, false, "Redirect to private IP should be blocked");
    console.log(`PASS: Redirect to private IP blocked (${r2.error})`);

    // Redirect chain limit
    fetchCalls = [];
    const r3 = await safeFetch("https://example.com/redirect-chain-1", 5000);
    assert.equal(r3.ok, false, "Redirect chain exceeding limit should be blocked");
    console.log(`PASS: Redirect chain blocked (${r3.error})`);

    // Redirect to non-HTTP protocol
    fetchCalls = [];
    const r4 = await safeFetch("https://example.com/redirect-to-non-http", 5000);
    assert.equal(r4.ok, false, "Redirect to non-HTTP should be blocked");
    console.log(`PASS: Redirect to non-HTTP blocked (${r4.error})`);

    // Redirect without location
    fetchCalls = [];
    const r5 = await safeFetch("https://example.com/redirect-no-location", 5000);
    assert.equal(r5.ok, false, "Redirect without location should fail");
    console.log(`PASS: Redirect without location rejected (${r5.error})`);

    // Valid redirect (https -> http same host)
    fetchCalls = [];
    const r6 = await safeFetch("https://example.com/redirect-to-http", 5000);
    assert.equal(r6.ok, true, "Valid HTTP redirect should succeed");
    assert.equal(r6.body, "OK");
    console.log("PASS: Valid redirect (https->http) succeeded");

    // Large response rejected
    fetchCalls = [];
    const r7 = await safeFetch("https://example.com/large", 5000);
    assert.equal(r7.ok, false, "Large response should be rejected");
    assert.equal(r7.status, 413);
    console.log("PASS: Large response rejected");

    // Timeout
    fetchCalls = [];
    const r8 = await safeFetch("https://example.com/slow", 200);
    assert.equal(r8.ok, false, "Slow response should timeout");
    console.log(`PASS: Timeout works (${r8.error})`);

    // Invalid protocol
    const r9 = await safeFetch("ftp://example.com/file", 5000);
    assert.equal(r9.ok, false, "Non-HTTP protocol should be rejected");
    console.log("PASS: Invalid protocol rejected");

    // Invalid URL
    const r10 = await safeFetch("not-a-url", 5000);
    assert.equal(r10.ok, false, "Invalid URL should be rejected");
    console.log("PASS: Invalid URL rejected");

    // DNS resolves to private IP
    const r11 = await safeFetch("https://evil.example.com/manifest.json", 5000);
    assert.equal(r11.ok, false, "DNS to private IP should be blocked");
    console.log(`PASS: DNS rebinding/private IP blocked (${r11.error})`);

  } finally {
    (globalThis as unknown as { fetch: MockFetch }).fetch = originalFetch as MockFetch;
    (dns.promises as { lookup: (hostname: string, opts?: { all?: boolean }) => Promise<unknown> }).lookup = originalLookup;
  }

  console.log("\nAll SSRF Redirect Tests Passed!");
}

runTests().catch((err) => {
  console.error("SSRF redirect test failed:", err);
  process.exit(1);
});
