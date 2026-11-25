import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import { POST as registerHandler } from "../app/api/v1/auth/register/route";
import { POST as addonsPost } from "../app/api/v1/addons/route";
import { GET as addonsGet } from "../app/api/v1/addons/route";
import { POST as previewHandler } from "../app/api/v1/addons/preview/route";
import { PATCH as addonPatch } from "../app/api/v1/addons/[id]/route";
import { POST as refreshHandler } from "../app/api/v1/addons/[id]/refresh/route";
import { DELETE as addonDelete } from "../app/api/v1/addons/route";
import { GET as catalogHome } from "../app/api/v1/catalog/home/route";
import { GET as catalogSearch } from "../app/api/v1/catalog/search/route";
import { GET as titleDetail } from "../app/api/v1/catalog/title/[id]/route";
import { GET as playbackHandler } from "../app/api/v1/playback/[titleId]/route";
import { POST as watchlistPost } from "../app/api/v1/watchlist/route";
import { GET as watchlistGet } from "../app/api/v1/watchlist/route";
import { POST as historyPost } from "../app/api/v1/history/route";
import { GET as historyGet } from "../app/api/v1/history/route";
import { prisma } from "../lib/db";

const CINEMETA_MANIFEST = "https://v3-cinemeta.strem.io/manifest.json";

async function runTests() {
  console.log("=== FUNCTIONAL TESTING ===\n");

  console.log("--- 1. Authentication ---");
  const email = "functest_" + Date.now() + "@example.com";
  const regRes = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Func Test", email, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const regJson = await regRes.json();
  assert.equal(regRes.status, 201, "Register should succeed");
  console.log("PASS: Register new user");
  const token = regJson.data.token;
  const headers = { Authorization: "Bearer " + token, "Content-Type": "application/json" };

  console.log("\n--- 2. Add-on Integration ---");

  const previewRes = await previewHandler(
    new NextRequest("http://localhost/api/v1/addons/preview", {
      method: "POST",
      body: JSON.stringify({ manifestUrl: CINEMETA_MANIFEST }),
      headers,
    })
  );
  const previewJson = await previewRes.json();
  console.log("Preview status: " + previewRes.status);
  if (previewRes.status === 200) {
    console.log("PASS: Preview cinemeta manifest successful");
    console.log("  Manifest: " + previewJson.data.manifest.name + " v" + previewJson.data.manifest.version);
  } else {
    console.log("  Preview failed: " + JSON.stringify(previewJson));
  }

  const installRes = await addonsPost(
    new NextRequest("http://localhost/api/v1/addons", {
      method: "POST",
      body: JSON.stringify({ manifestUrl: CINEMETA_MANIFEST }),
      headers,
    })
  );
  const installJson = await installRes.json();
  console.log("Install status: " + installRes.status);
  if (installRes.status === 201) {
    console.log("PASS: Install cinemeta addon successful");
  } else {
    console.log("  Install result: " + JSON.stringify(installJson));
  }
  const addonId = installJson.data && installJson.data.id;

  const listRes = await addonsGet(new NextRequest("http://localhost/api/v1/addons", { headers }));
  const listJson = await listRes.json();
  console.log("List addons: " + (listJson.data && listJson.data.length) + " installed");
  assert.ok(Array.isArray(listJson.data));

  if (addonId) {
    const disableRes = await addonPatch(
      new NextRequest("http://localhost/api/v1/addons/" + addonId, {
        method: "PATCH",
        body: JSON.stringify({ enabled: false }),
        headers,
      }),
      { params: Promise.resolve({ id: addonId }) }
    );
    console.log("Disable addon status: " + disableRes.status);

    const enableRes = await addonPatch(
      new NextRequest("http://localhost/api/v1/addons/" + addonId, {
        method: "PATCH",
        body: JSON.stringify({ enabled: true }),
        headers,
      }),
      { params: Promise.resolve({ id: addonId }) }
    );
    console.log("Enable addon status: " + enableRes.status);

    const refreshRes = await refreshHandler(
      new NextRequest("http://localhost/api/v1/addons/" + addonId + "/refresh", { method: "POST", headers }),
      { params: Promise.resolve({ id: addonId }) }
    );
    const refreshJson = await refreshRes.json();
    console.log("Refresh addon status: " + refreshRes.status + ", valid: " + (refreshJson.data && refreshJson.data.valid));
  }

  console.log("\n--- 3. Catalog ---");
  const homeRes = await catalogHome(new NextRequest("http://localhost/api/v1/catalog/home", { headers }));
  const homeJson = await homeRes.json();
  console.log("Catalog home status: " + homeRes.status);
  const totalItems = (homeJson.data && homeJson.data.trending && homeJson.data.trending.length || 0) +
    (homeJson.data && homeJson.data.popularMovies && homeJson.data.popularMovies.length || 0) +
    (homeJson.data && homeJson.data.popularSeries && homeJson.data.popularSeries.length || 0);
  console.log("Catalog items: " + totalItems);
  if (totalItems > 0) {
    console.log("PASS: Catalog returns data from addon");
    const sample = (homeJson.data.popularMovies && homeJson.data.popularMovies[0]) || (homeJson.data.trending && homeJson.data.trending[0]);
    console.log("  Sample: " + (sample && sample.name));
  } else {
    console.log("NOTICE: Catalog empty (addon may not return data or network issue)");
  }

  const searchRes = await catalogSearch(
    new NextRequest("http://localhost/api/v1/catalog/search?q=batman", { headers })
  );
  const searchJson = await searchRes.json();
  console.log("Search 'batman' status: " + searchRes.status + ", results: " + (searchJson.data && searchJson.data.results && searchJson.data.results.length || 0));
  if (searchJson.data && searchJson.data.results && searchJson.data.results.length > 0) {
    console.log("PASS: Search returns results from addon");
  }

  let firstItemId = null;
  if (homeJson.data && homeJson.data.popularMovies && homeJson.data.popularMovies.length > 0) {
    firstItemId = homeJson.data.popularMovies[0].id;
    const titleRes = await titleDetail(
      new NextRequest("http://localhost/api/v1/catalog/title/" + firstItemId + "?type=movie", { headers }),
      { params: Promise.resolve({ id: firstItemId }) }
    );
    const titleJson = await titleRes.json();
    console.log("Title detail status: " + titleRes.status);
    if (titleRes.status === 200) {
      console.log("  Title: " + titleJson.data.name);
      console.log("  Poster: " + (titleJson.data.poster ? "yes" : "no"));
      console.log("  Description: " + (titleJson.data.description ? "yes" : "no"));
      console.log("  Genres: " + (titleJson.data.genres && titleJson.data.genres.join(", ") || "none"));
      console.log("  Rating: " + (titleJson.data.imdbRating || "n/a"));
      console.log("  Cast: " + (titleJson.data.cast && titleJson.data.cast.length || 0));
      console.log("PASS: Title detail returns metadata from addon");
    }
  }

  console.log("\n--- 4. Playback ---");
  if (firstItemId) {
    const playbackRes = await playbackHandler(
      new NextRequest("http://localhost/api/v1/playback/" + firstItemId + "?type=movie", { headers }),
      { params: Promise.resolve({ titleId: firstItemId }) }
    );
    const playbackJson = await playbackRes.json();
    console.log("Playback status: " + playbackRes.status);
    console.log("  Sources: " + (playbackJson.data && playbackJson.data.sources && playbackJson.data.sources.length || 0));
    console.log("  Subtitles: " + (playbackJson.data && playbackJson.data.subtitles && playbackJson.data.subtitles.length || 0));
    if (playbackJson.data && playbackJson.data.sources && playbackJson.data.sources.length > 0) {
      console.log("PASS: Playback returns streams from addon");
      const src = playbackJson.data.sources[0];
      console.log("  Source URL: " + (src.sourceUrl && src.sourceUrl.substring(0, 80) + "..."));
      console.log("  Provider: " + src.providerName);
      console.log("  Playable: " + src.isPlayable);
    } else {
      console.log("NOTICE: No streams returned (addon may not provide streams for this title)");
    }
  }

  console.log("\n--- 5. Watchlist & History ---");
  const testTitleId = firstItemId || "tt0111161";
  const wlPostRes = await watchlistPost(
    new NextRequest("http://localhost/api/v1/watchlist", {
      method: "POST",
      body: JSON.stringify({ titleId: testTitleId }),
      headers,
    })
  );
  console.log("Watchlist add status: " + wlPostRes.status);

  const wlGetRes = await watchlistGet(new NextRequest("http://localhost/api/v1/watchlist", { headers }));
  const wlGetJson = await wlGetRes.json();
  console.log("Watchlist items: " + (wlGetJson.data && wlGetJson.data.length || 0));

  const histPostRes = await historyPost(
    new NextRequest("http://localhost/api/v1/history", {
      method: "POST",
      body: JSON.stringify({ titleId: testTitleId, positionSeconds: 120 }),
      headers,
    })
  );
  console.log("History record status: " + histPostRes.status);

  const histGetRes = await historyGet(new NextRequest("http://localhost/api/v1/history", { headers }));
  const histGetJson = await histGetRes.json();
  console.log("History items: " + (histGetJson.data && histGetJson.data.length || 0));

  console.log("\n--- 6. Ownership ---");
  const user2Email = "functest2_" + Date.now() + "@example.com";
  const reg2Res = await registerHandler(
    new NextRequest("http://localhost/api/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ name: "Func Test 2", email: user2Email, password: "password123" }),
      headers: { "Content-Type": "application/json" },
    })
  );
  const reg2Json = await reg2Res.json();
  const token2 = reg2Json.data.token;
  const headers2 = { Authorization: "Bearer " + token2, "Content-Type": "application/json" };

  const user2Addons = await addonsGet(new NextRequest("http://localhost/api/v1/addons", { headers: headers2 }));
  const user2AddonsJson = await user2Addons.json();
  console.log("User2 addons count: " + (user2AddonsJson.data && user2AddonsJson.data.length || 0) + " (should be 0)");
  assert.equal(user2AddonsJson.data && user2AddonsJson.data.length || 0, 0, "User2 should have no addons");

  console.log("\n--- 7. Cleanup ---");
  if (addonId) {
    const delRes = await addonDelete(
      new NextRequest("http://localhost/api/v1/addons?id=" + addonId, { method: "DELETE", headers })
    );
    console.log("Cleanup: delete addon status " + delRes.status);
  }

  await prisma.user.delete({ where: { email } }).catch(() => {});
  await prisma.user.delete({ where: { email: user2Email } }).catch(() => {});

  console.log("\n=== FUNCTIONAL TESTING COMPLETE ===");
}

runTests().catch((err) => {
  console.error("Functional test failed:", err);
  process.exit(1);
});
