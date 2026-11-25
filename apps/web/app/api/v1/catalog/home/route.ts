import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonCatalog } from "@/lib/addon-client";
import type { AddonCatalogItem } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { catalogIdentity, catalogItemScore } from "@/lib/catalog";

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.catalog, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });

  type HomeItem = AddonCatalogItem & { addonId?: string; addonName?: string };
  const allItems: HomeItem[] = [];

  for (const addon of addons) {
    let manifestUrl: string;
    try {
      manifestUrl = decryptUrl(addon.manifestUrlEncrypted);
    } catch {
      continue;
    }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) {
      console.error(`[catalog-home] Invalid manifest for addon "${addon.name}":`, result.errors);
      continue;
    }

    const catalogs = result.manifest.catalogs || [];
    console.log(`[catalog-home] Addon "${addon.name}" (v${addon.version}) has ${catalogs.length} catalogs.`);

    if (catalogs.length === 0) {
      console.warn(`[catalog-home] Addon "${addon.name}" has NO catalogs defined in manifest. It might be a stream-only addon.`);
    }

    for (const cat of catalogs) {
      console.log(`[catalog-home] Fetching catalog: addon="${addon.name}", type="${cat.type}", id="${cat.id}"`);
      try {
        const items = await fetchAddonCatalog(manifestUrl, result.manifest, cat.type, cat.id);
        console.log(`[catalog-home] Received ${items.length} items from "${addon.name}" for ${cat.type}:${cat.id}`);
        for (const item of items) {
          allItems.push({ ...item, addonId: addon.id, addonName: addon.name });
        }
      } catch (err: unknown) {
        console.error(`[catalog-home] Failed to fetch catalog from "${addon.name}" (${cat.type}:${cat.id}):`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  // Deduplicate by content identity (type:id), keeping the entry with the
  // richest metadata. Do NOT key on title: distinct titles may share a name.
  const best = new Map<string, HomeItem>();
  for (const item of allItems) {
    const key = catalogIdentity(item);
    const previous = best.get(key);
    if (!previous || catalogItemScore(item) > catalogItemScore(previous)) {
      best.set(key, item);
    }
  }
  const uniqueItems = Array.from(best.values());

  // Map into home sections
  const homeData: Record<string, HomeItem[]> = {
    trending: [],
    popularMovies: [],
    popularSeries: [],
    topRatedMovies: [],
    topRatedSeries: [],
  };

  let popularMoviesStarted = false;
  let popularSeriesStarted = false;
  for (const item of uniqueItems) {
    if (item.type === "movie" || item.type === "film") {
      if (!popularMoviesStarted) {
        homeData.popularMovies = [item];
        popularMoviesStarted = true;
      } else {
        homeData.trending.push(item);
      }
    } else if (item.type === "series" || item.type === "tv" || item.type === "show") {
      if (!popularSeriesStarted) {
        homeData.popularSeries = [item];
        popularSeriesStarted = true;
      } else {
        homeData.topRatedSeries.push(item);
      }
    }
  }

  return NextResponse.json({ success: true, data: homeData });
}
