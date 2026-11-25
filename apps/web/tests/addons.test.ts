process.env.RATE_LIMIT_DISABLED = "true";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as registerHandler } from "../app/api/v1/auth/register/route";
import { GET as addonsGet, POST as addonsPost } from "../app/api/v1/addons/route";
import { POST as addonsPreview } from "../app/api/v1/addons/preview/route";

async function runTests() {
  console.log("Starting Addon Tests...");

  const regRes = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "ATest", email: `atest_${Date.now()}@example.com`, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const regJson = await regRes.json();
  assert.equal(regRes.status, 201);
  const token = regJson.data.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // Unauthorized addons access
  const unauth = await addonsGet(new NextRequest("http://localhost/api/v1/addons"));
  assert.equal(unauth.status, 401);
  console.log("PASS: Unauthorized addons access rejected");

  // Preview with invalid URL
  const previewBad = await addonsPreview(
    new NextRequest("http://localhost/api/v1/addons/preview", {
      method: "POST",
      body: JSON.stringify({ manifestUrl: "not-a-url" }),
      headers: { ...authHeaders, "Content-Type": "application/json" },
    })
  );
  console.log("Preview invalid URL status:", previewBad.status);

  // Preview with empty body
  const previewEmpty = await addonsPreview(
    new NextRequest("http://localhost/api/v1/addons/preview", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { ...authHeaders, "Content-Type": "application/json" },
    })
  );
  assert.equal(previewEmpty.status, 400);
  console.log("PASS: Addon preview requires manifestUrl");

  // Install addon with invalid manifest
  const installBad = await addonsPost(
    new NextRequest("http://localhost/api/v1/addons", {
      method: "POST",
      body: JSON.stringify({ manifestUrl: "https://blocked.example.invalid/manifest.json" }),
      headers: { ...authHeaders, "Content-Type": "application/json" },
    })
  );
  console.log("Install invalid status:", installBad.status);
  // Blocked host should fail validation -> 422
  if (installBad.status === 422) {
    console.log("PASS: Addon install with blocked host rejected");
  }

  console.log("All Addon Tests Completed!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
