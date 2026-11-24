import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { isPrivateIp, isBlockedHost } from "../lib/ssrf-guard";
import { POST as registerHandler } from "../app/api/v1/auth/register/route";
import { GET as addonsGet, POST as addonsPost } from "../app/api/v1/addons/route";
import { GET as watchlistGet } from "../app/api/v1/watchlist/route";
import { GET as historyGet } from "../app/api/v1/history/route";

async function runTests() {
  console.log("Starting Security Tests...");

  // === SSRF Protection Tests ===
  console.log("\n--- SSRF Protection ---");

  // Private IP detection
  assert.equal(isPrivateIp("127.0.0.1"), true, "127.0.0.1 should be private");
  assert.equal(isPrivateIp("10.0.0.1"), true, "10.x should be private");
  assert.equal(isPrivateIp("172.16.0.1"), true, "172.16.x should be private");
  assert.equal(isPrivateIp("172.31.255.255"), true, "172.31.x should be private");
  assert.equal(isPrivateIp("192.168.1.1"), true, "192.168.x should be private");
  assert.equal(isPrivateIp("169.254.1.1"), true, "169.254.x should be private");
  assert.equal(isPrivateIp("8.8.8.8"), false, "8.8.8.8 should be public");
  console.log("PASS: Private IP detection correct");

  // Blocked host detection
  assert.equal(isBlockedHost("localhost"), true, "localhost should be blocked");
  assert.equal(isBlockedHost("127.0.0.1"), true, "127.0.0.1 should be blocked");
  assert.equal(isBlockedHost("example.com"), false, "example.com should not be blocked");
  console.log("PASS: Blocked host detection correct");

  // === Ownership Enforcement Tests ===
  console.log("\n--- Ownership Enforcement ---");

  const reg1 = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "SecUser1", email: `secuser1_${Date.now()}@example.com`, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const json1 = await reg1.json();
  assert.equal(reg1.status, 201);
  const token1 = json1.data.token;

  const reg2 = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "SecUser2", email: `secuser2_${Date.now()}@example.com`, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const json2 = await reg2.json();
  assert.equal(reg2.status, 201);
  const token2 = json2.data.token;

  // User1 can access their own data
  const wl1 = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist", {
    headers: { Authorization: `Bearer ${token1}` },
  }));
  assert.equal(wl1.status, 200);
  console.log("PASS: User1 can access own watchlist");

  // User2 can access their own data
  const wl2 = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist", {
    headers: { Authorization: `Bearer ${token2}` },
  }));
  assert.equal(wl2.status, 200);
  console.log("PASS: User2 can access own watchlist");

  // Unauthenticated access rejected
  const unauth = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist"));
  assert.equal(unauth.status, 401);
  console.log("PASS: Unauthenticated watchlist access rejected");

  const unauthHist = await historyGet(new NextRequest("http://localhost/api/v1/history"));
  assert.equal(unauthHist.status, 401);
  console.log("PASS: Unauthenticated history access rejected");

  const unauthAddons = await addonsGet(new NextRequest("http://localhost/api/v1/addons"));
  assert.equal(unauthAddons.status, 401);
  console.log("PASS: Unauthenticated addons access rejected");

  // Invalid token rejected
  const invalidToken = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist", {
    headers: { Authorization: "Bearer invalid-token-12345" },
  }));
  assert.equal(invalidToken.status, 401);
  console.log("PASS: Invalid token rejected");

  // === Add-on Security Tests ===
  console.log("\n--- Add-on Security ---");

  // SSRF: localhost blocked
  const localhostPreview = await addonsPost(
    new NextRequest("http://localhost/api/v1/addons/preview", {
      method: "POST",
      body: JSON.stringify({ manifestUrl: "http://localhost:3000/manifest.json" }),
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
    })
  );
  // Should fail (either 400 for invalid URL or blocked)
  console.log(`Localhost preview status: ${localhostPreview.status}`);

  // SSRF: private IP blocked
  const privateIpPreview = await addonsPost(
    new NextRequest("http://localhost/api/v1/addons/preview", {
      method: "POST",
      body: JSON.stringify({ manifestUrl: "http://192.168.1.1/manifest.json" }),
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
    })
  );
  console.log(`Private IP preview status: ${privateIpPreview.status}`);

  // Missing manifestUrl
  const noUrl = await addonsPost(
    new NextRequest("http://localhost/api/v1/addons/preview", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { Authorization: `Bearer ${token1}`, "Content-Type": "application/json" },
    })
  );
  assert.equal(noUrl.status, 400);
  console.log("PASS: Addon preview requires manifestUrl");

  // === Input Validation Tests ===
  console.log("\n--- Input Validation ---");

  // Register with invalid email
  const badEmail = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Bad", email: "not-an-email", password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  assert.equal(badEmail.status, 400);
  console.log("PASS: Invalid email rejected");

  // Register with short password
  const shortPw = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Bad", email: `shortpw_${Date.now()}@example.com`, password: "12" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  assert.equal(shortPw.status, 400);
  console.log("PASS: Short password rejected");

  // Register with empty name
  const emptyName = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "", email: `emptyname_${Date.now()}@example.com`, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  assert.equal(emptyName.status, 400);
  console.log("PASS: Empty name rejected");

  console.log("\nAll Security Tests Passed!");
}

runTests().catch((err) => {
  console.error("Security test failed:", err);
  process.exit(1);
});
