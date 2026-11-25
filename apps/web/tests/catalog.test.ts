process.env.RATE_LIMIT_DISABLED = "true";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { GET as homeHandler } from "../app/api/v1/catalog/home/route";
import { GET as searchHandler } from "../app/api/v1/catalog/search/route";
import { GET as titleHandler } from "../app/api/v1/catalog/title/[id]/route";
import { POST as registerHandler } from "../app/api/v1/auth/register/route";
import { prisma } from "../lib/db";

async function runTests() {
  console.log("Starting Catalog Tests (addon-based)...");

  // Register a test user
  const email = `catalog_${Date.now()}@example.com`;
  const regRes = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Catalog Tester", email, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const regJson = await regRes.json();
  assert.equal(regRes.status, 201);
  const token = regJson.data.token;
  const headers = { Authorization: `Bearer ${token}` };

  // Catalog home - empty for new user (no addons)
  const homeRes = await homeHandler(new NextRequest("http://localhost/api/v1/catalog/home", { headers }));
  const homeJson = await homeRes.json();
  assert.equal(homeRes.status, 200);
  assert.equal(homeJson.success, true);
  assert.ok(Array.isArray(homeJson.data.trending));
  console.log("PASS: Catalog home returns sections (empty for new user)");

  // Search - empty results
  const searchRes = await searchHandler(
    new NextRequest("http://localhost/api/v1/catalog/search?q=test", { headers })
  );
  const searchJson = await searchRes.json();
  assert.equal(searchRes.status, 200);
  assert.equal(searchJson.success, true);
  assert.ok(Array.isArray(searchJson.data.results));
  console.log("PASS: Catalog search returns results");

  // Empty search
  const emptySearchRes = await searchHandler(
    new NextRequest("http://localhost/api/v1/catalog/search", { headers })
  );
  const emptySearchJson = await emptySearchRes.json();
  assert.deepEqual(emptySearchJson.data.results, []);
  console.log("PASS: Empty search returns empty results");

  // Title detail not found without addons
  const titleRes = await titleHandler(
    new NextRequest("http://localhost/api/v1/catalog/title/notfound?type=movie", { headers }),
    { params: Promise.resolve({ id: "notfound" }) }
  );
  assert.equal(titleRes.status, 404);
  console.log("PASS: Title detail returns 404 without addons");

  // Unauthorized access
  const unauthRes = await homeHandler(new NextRequest("http://localhost/api/v1/catalog/home"));
  assert.equal(unauthRes.status, 401);
  console.log("PASS: Unauthorized catalog access rejected");

  // Cleanup test user
  await prisma.user.delete({ where: { email } }).catch(() => {});
  console.log("All Catalog Tests Passed Successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
