import assert from "node:assert/strict";
import { fetchAddonStreams, fetchAddonSubtitles, getStreamPlayableUrl } from "../lib/addon-client";
import { AddonManifest } from "../lib/addon-service";

process.env.RATE_LIMIT_DISABLED = "true";

async function runTests() {
  console.log("Starting Playback API Tests...");

  const mockManifest: AddonManifest = {
    id: "test-addon",
    name: "Test Addon",
    version: "1.0.0",
    resources: ["stream", "subtitles"],
    types: ["movie"],
  };

  const mockStreams = [
    { url: "https://www.w3schools.com/html/mov_bbb.mp4", name: "720p" },
    { url: "javascript:alert(1)", name: "Dangerous" },
    { externalUrl: "https://example.com/stream", name: "External" }
  ];
  const mockSubs = [{ url: "https://example.com/en.vtt", lang: "en" }];

  const originalFetch = globalThis.fetch;
  const dns = await import("node:dns");
  const originalLookup = dns.promises.lookup;
  (dns.promises as { lookup: (hostname: string, opts?: { all?: boolean }) => Promise<unknown> }).lookup = async (hostname: string, opts?: { all?: boolean }) => {
    if (opts?.all) return [{ address: "93.184.216.34", family: 4 }];
    return { address: "93.184.216.34", family: 4 };
  };

  const mockFetch = async (input: RequestInfo | URL): Promise<Response> => {
    const url = input.toString();
    if (url.includes("/stream/")) return new Response(JSON.stringify({ streams: mockStreams }));
    if (url.includes("/subtitles/")) return new Response(JSON.stringify({ subtitles: mockSubs }));
    return new Response("Not Found", { status: 404 });
  };
  (globalThis as unknown as { fetch: typeof mockFetch }).fetch = mockFetch;

  try {
    // 1. Discovery
    const streams = await fetchAddonStreams("https://mock.example/manifest.json", mockManifest, "movie", "test-1");
    assert.equal(streams.length, 3);
    console.log("PASS: Discovery streams");

    const subs = await fetchAddonSubtitles("https://mock.example/manifest.json", mockManifest, "movie", "test-1");
    assert.equal(subs.length, 1);
    console.log("PASS: Discovery subtitles");

    // 2. Playable URL safety
    const playableUrl = getStreamPlayableUrl(streams[0]);
    assert.equal(playableUrl, "https://www.w3schools.com/html/mov_bbb.mp4");

    const badUrl = getStreamPlayableUrl(streams[1]);
    assert.equal(badUrl, null, "Dangerous URL should be rejected");
    
    console.log("PASS: Playable URL safety");
  } finally {
    (globalThis as unknown as { fetch: typeof globalThis.fetch }).fetch = originalFetch;
    (dns.promises as { lookup: (hostname: string, opts?: { all?: boolean }) => Promise<unknown> }).lookup = originalLookup;
  }

  console.log("\nAll Playback API Tests Passed!");
}

runTests().catch((err) => {
  console.error("Playback test failed:", err);
  process.exit(1);
});
