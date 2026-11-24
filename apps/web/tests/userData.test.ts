import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as registerHandler } from "../app/api/v1/auth/register/route";
import { GET as watchlistGet, POST as watchlistPost, DELETE as watchlistDelete } from "../app/api/v1/watchlist/route";
import { GET as historyGet, POST as historyPost, PATCH as historyPatch, DELETE as historyDelete } from "../app/api/v1/history/route";

async function runTests() {
  console.log("Starting User Data Tests...");

  // Register + login to get a session
  const regRes = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "UDTest", email: `udtest_${Date.now()}@example.com`, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const regJson = await regRes.json();
  assert.equal(regRes.status, 201);
  assert.equal(regJson.success, true);
  const token = regJson.data.token;
  console.log("PASS: User registered");

  const authHeaders = { Authorization: `Bearer ${token}` };

  // Watchlist: GET empty
  const wlGet1 = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist", { headers: authHeaders }));
  const wlGet1Json = await wlGet1.json();
  assert.equal(wlGet1.status, 200);
  assert.deepEqual(wlGet1Json.data, []);
  console.log("PASS: Watchlist empty initially");

  // Watchlist: POST
  const wlPost = await watchlistPost(
    new NextRequest("http://localhost/api/v1/watchlist", {
      method: "POST",
      body: JSON.stringify({ titleId: "999999" }),
      headers: { ...authHeaders, "Content-Type": "application/json" },
    })
  );
  const wlPostJson = await wlPost.json();
  assert.equal(wlPost.status, 200);
  assert.equal(wlPostJson.success, true);
  console.log("PASS: Watchlist item added");

  // Watchlist: GET with item
  const wlGet2 = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist", { headers: authHeaders }));
  const wlGet2Json = await wlGet2.json();
  assert.equal(wlGet2Json.data.length, 1);
  assert.equal(wlGet2Json.data[0].id, "999999");
  console.log("PASS: Watchlist returns added item");

  // Watchlist: POST duplicate
  const wlPost2 = await watchlistPost(
    new NextRequest("http://localhost/api/v1/watchlist", {
      method: "POST",
      body: JSON.stringify({ titleId: "999999" }),
      headers: { ...authHeaders, "Content-Type": "application/json" },
    })
  );
  const wlPost2Json = await wlPost2.json();
  assert.equal(wlPost2Json.data.already, true);
  console.log("PASS: Duplicate watchlist returns already:true");

  // History: POST
  const histPost = await historyPost(
    new NextRequest("http://localhost/api/v1/history", {
      method: "POST",
      body: JSON.stringify({ titleId: "999999", positionSeconds: 45 }),
      headers: { ...authHeaders, "Content-Type": "application/json" },
    })
  );
  const histPostJson = await histPost.json();
  assert.equal(histPost.status, 200);
  assert.equal(histPostJson.success, true);
  const progressId = histPostJson.data.progress.id;
  console.log("PASS: History progress recorded");

  // History: GET
  const histGet1 = await historyGet(new NextRequest("http://localhost/api/v1/history", { headers: authHeaders }));
  const histGet1Json = await histGet1.json();
  assert.equal(histGet1Json.data.length, 1);
  assert.equal(histGet1Json.data[0].positionSeconds, 45);
  console.log("PASS: History GET returns progress");

  // History: PATCH completed
  const histPatch = await historyPatch(
    new NextRequest(`http://localhost/api/v1/history?id=${progressId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed: true }),
      headers: { ...authHeaders, "Content-Type": "application/json" },
    })
  );
  assert.equal(histPatch.status, 200);
  console.log("PASS: History PATCH marks completed");

  // History: DELETE
  const histDelete = await historyDelete(
    new NextRequest(`http://localhost/api/v1/history?id=${progressId}`, { headers: authHeaders })
  );
  assert.equal(histDelete.status, 200);
  const histGet2 = await historyGet(new NextRequest("http://localhost/api/v1/history", { headers: authHeaders }));
  const histGet2Json = await histGet2.json();
  assert.equal(histGet2Json.data.length, 0);
  console.log("PASS: History DELETE removes item");

  // Watchlist: DELETE
  const wlDelete = await watchlistDelete(
    new NextRequest("http://localhost/api/v1/watchlist?titleId=999999", { headers: authHeaders })
  );
  assert.equal(wlDelete.status, 200);
  const wlGet3 = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist", { headers: authHeaders }));
  const wlGet3Json = await wlGet3.json();
  assert.equal(wlGet3Json.data.length, 0);
  console.log("PASS: Watchlist DELETE removes item");

  // Unauthorized access
  const unauth = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist"));
  assert.equal(unauth.status, 401);
  console.log("PASS: Unauthorized access rejected");

  console.log("All User Data Tests Passed Successfully!");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
