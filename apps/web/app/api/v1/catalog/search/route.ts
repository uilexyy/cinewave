import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonCatalog } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import type { AddonCatalogItem } from "@/lib/addon-client";
import { catalogIdentity, catalogItemScore } from "@/lib/catalog";

type SearchItem = AddonCatalogItem & { addonId?: string; addonName?: string };

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.search, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";
  const page = Number(searchParams.get("page") || "1");

  if (!query) {
    return NextResponse.json({ success: true, data: { results: [] } });
  }

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });

  const allResults: SearchItem[] = [];

  for (const addon of addons) {
    let manifestUrl: string;
    try {
      manifestUrl = decryptUrl(addon.manifestUrlEncrypted);
    } catch {
      continue;
    }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) continue;

    const catalogs = result.manifest.catalogs || [];
    for (const cat of catalogs) {
      const items = await fetchAddonCatalog(manifestUrl, result.manifest, cat.type, cat.id, { search: query });
      for (const item of items) {
        allResults.push({ ...item, addonId: addon.id, addonName: addon.name });
      }
    }
  }

  // Deduplicate globally by content identity (type:id) so the same title
  // returned by multiple add-ons/catalogs appears once.
  const best = new Map<string, SearchItem>();
  for (const item of allResults) {
    const key = catalogIdentity(item);
    const previous = best.get(key);
    if (!previous || catalogItemScore(item) > catalogItemScore(previous)) {
      best.set(key, item);
    }
  }
  const uniqueResults = Array.from(best.values());

  return NextResponse.json({
    success: true,
    data: {
      page,
      totalPages: 1,
      totalResults: uniqueResults.length,
      results: uniqueResults,
    },
  });
}
