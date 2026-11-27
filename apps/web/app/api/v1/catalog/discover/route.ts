import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonCatalog } from "@/lib/addon-client";
import type { AddonCatalogItem } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { mergeCatalogItems } from "@/lib/catalog";
import { PLATFORMS, getPlatformFromCatalogId, normalizeGenres, sortTopRated, ALL_GENRES, isValidImdbRating } from "@/lib/catalog-categories";

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;
  const rl = await enforceRateLimit(req, RATE_LIMITS.catalog, user?.id ?? null);
  if (rl) return rl;
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "all"; // movie | series | all
  const platform = searchParams.get("platform") || "";
  const genre = searchParams.get("genre") || "";
  const q = searchParams.get("q")?.toLowerCase() || "";
  const sort = searchParams.get("sort") || "popular";

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });

  type Item = AddonCatalogItem & { addonId?: string; addonName?: string; platform?: string; catalogId?: string };
  const allItems: Item[] = [];

  for (const addon of addons) {
    let manifestUrl: string;
    try { manifestUrl = decryptUrl(addon.manifestUrlEncrypted); }
    catch { continue; }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) continue;

    const catalogs = result.manifest.catalogs || [];
    for (const cat of catalogs) {
      if (platform) {
        const plat = getPlatformFromCatalogId(cat.id);
        if (plat !== platform) continue;
      }
      try {
        const items = await fetchAddonCatalog(manifestUrl, result.manifest, cat.type, cat.id);
        for (const item of items) {
          const normalizedGenres = normalizeGenres(item.genres);
          allItems.push({ ...item, genres: normalizedGenres, addonId: addon.id, addonName: addon.name, platform: getPlatformFromCatalogId(cat.id) || undefined, catalogId: cat.id });
        }
      } catch { /* ignore */ }
    }
  }

  // Dedup - preserve platform attribution via mergeCatalogItems
  let items = mergeCatalogItems(allItems);

  // Type filter
  if (type === "movie") items = items.filter(i => i.type === "movie" || i.type === "film");
  else if (type === "series") items = items.filter(i => i.type === "series" || i.type === "tv" || i.type === "show");

  // Genre filter
  if (genre) {
    items = items.filter(i => (i.genres || []).includes(genre));
  }

  // Search
  if (q) {
    items = items.filter(i => i.name?.toLowerCase().includes(q));
  }

  // Sort
  if (sort === "top-rated") items = sortTopRated(items.filter(isValidImdbRating));
  else if (sort === "newest") items = [...items].sort((a, b) => (b.releaseInfo || "").localeCompare(a.releaseInfo || ""));
  else if (sort === "name") items = [...items].sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  // Available platforms/genres for filter UI
  const availablePlatforms = Object.keys(PLATFORMS);
  const genreSet = new Set<string>();
  items.forEach(i => (i.genres || []).forEach(g => genreSet.add(g)));
  const availableGenres = ALL_GENRES.filter(g => genreSet.has(g));

  return NextResponse.json({
    success: true,
    data: { results: items, availablePlatforms, availableGenres, total: items.length },
  });
}
