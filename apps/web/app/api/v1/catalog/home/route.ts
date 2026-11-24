import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonCatalog } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });

  const sections: Record<string, any[]> = {};

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
      const key = `${cat.type}:${cat.id}`;
      if (!sections[key]) sections[key] = [];
      
      console.log(`[catalog-home] Fetching catalog: addon="${addon.name}", type="${cat.type}", id="${cat.id}"`);
      
      try {
        const items = await fetchAddonCatalog(manifestUrl, result.manifest, cat.type, cat.id);
        console.log(`[catalog-home] Received ${items.length} items from "${addon.name}" for ${key}`);
        for (const item of items) {
          sections[key].push({ ...item, addonId: addon.id, addonName: addon.name });
        }
      } catch (err: any) {
        console.error(`[catalog-home] Failed to fetch catalog from "${addon.name}" (${key}):`, err.message);
      }
    }
  }

  // Map into home sections
  const homeData: Record<string, any[]> = {
    trending: [],
    popularMovies: [],
    popularSeries: [],
    topRatedMovies: [],
    topRatedSeries: [],
  };

  for (const [key, items] of Object.entries(sections)) {
    const [type] = key.split(":");
    if (type === "movie" || type === "film") {
      if (homeData.popularMovies.length === 0) homeData.popularMovies = items;
      else homeData.trending = [...homeData.trending, ...items];
    } else if (type === "series" || type === "tv" || type === "show") {
      if (homeData.popularSeries.length === 0) homeData.popularSeries = items;
      else homeData.topRatedSeries = [...homeData.topRatedSeries, ...items];
    }
  }

  return NextResponse.json({ success: true, data: homeData });
}
