import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonCatalog } from "@/lib/addon-client";
import type { AddonCatalogItem } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { mergeCatalogItems } from "@/lib/catalog";
import { PLATFORMS, getPlatformFromCatalogId, sortTopRated, isAnime, isDocumentary, normalizeGenres, ALL_GENRES, isValidImdbRating } from "@/lib/catalog-categories";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.catalog, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const skip = Math.max(0, parseInt(searchParams.get("skip") || "0", 10) || 0);
  const limit = Math.min(PAGE_SIZE, Math.max(1, parseInt(searchParams.get("limit") || String(PAGE_SIZE), 10) || PAGE_SIZE));

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });

  type HomeItem = AddonCatalogItem & { addonId?: string; addonName?: string; platform?: string; catalogId?: string };
  const allItems: HomeItem[] = [];
  const addonStats: Record<string, { name: string; items: number; failed: boolean }> = {};

  const trendingCatalogIds = ["trending-movies", "trending-series"];
  const popularMovieCatalogIds = ["popular-movies"];
  const popularSeriesCatalogIds = ["popular-series"];
  const trendingMovies: HomeItem[] = [];
  const popularMovies: HomeItem[] = [];
  const popularSeries: HomeItem[] = [];

  for (const addon of addons) {
    let manifestUrl: string;
    try {
      manifestUrl = decryptUrl(addon.manifestUrlEncrypted);
    } catch {
      addonStats[addon.id] = { name: addon.name, items: 0, failed: true };
      continue;
    }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) {
      console.error(`[catalog-home] Invalid manifest for addon "${addon.name}":`, result.errors);
      addonStats[addon.id] = { name: addon.name, items: 0, failed: true };
      continue;
    }

    const catalogs = result.manifest.catalogs || [];
    const catalogsToFetch: Array<{ type: string; id: string }> = [];
    for (const cat of catalogs) {
      // Stremio supports catalog pagination via 'skip' parameter in the catalog request.
      catalogsToFetch.push({ type: cat.type, id: cat.id });
    }

    let addonItemCount = 0;
    let addonFailed = false;

    for (const cat of catalogsToFetch) {
      try {
        // Implement incremental loading: load requested page if pagination supported,
        // otherwise only load initial page (skip=0).
        const items = await fetchAddonCatalog(manifestUrl, result.manifest, cat.type, cat.id, { skip: String(skip) });
        const platform = getPlatformFromCatalogId(cat.id);
        addonItemCount += items.length;
        for (const item of items) {
          const normalizedGenres = normalizeGenres(item.genres);
          const enrichedItem: HomeItem = {
            ...item,
            genres: normalizedGenres,
            addonId: addon.id,
            addonName: addon.name,
            platform: platform || undefined,
            catalogId: cat.id,
          };
          allItems.push(enrichedItem);

          if (trendingCatalogIds.includes(cat.id)) trendingMovies.push(enrichedItem);
          else if (popularMovieCatalogIds.includes(cat.id)) popularMovies.push(enrichedItem);
          else if (popularSeriesCatalogIds.includes(cat.id)) popularSeries.push(enrichedItem);
        }
      } catch (err: unknown) {
        addonFailed = true;
        console.error(`[catalog-home] Failed to fetch catalog from "${addon.name}" (${cat.type}:${cat.id}):`, err instanceof Error ? err.message : String(err));
      }
    }
    addonStats[addon.id] = { name: addon.name, items: addonItemCount, failed: addonFailed };
  }

  const uniqueItems = mergeCatalogItems(allItems);

  const isMovie = (i: HomeItem) => i.type === "movie" || i.type === "film";
  const isSeries = (i: HomeItem) => i.type === "series" || i.type === "tv" || i.type === "show";

  type HomeDataShape = {
    trending: unknown[];
    popularMovies: unknown[];
    popularSeries: unknown[];
    topRatedMovies: unknown[];
    topRatedSeries: unknown[];
    streamingServices: Record<string, unknown[]>;
    genres: string[];
    anime: unknown[];
    documentary: unknown[];
  };
  const homeData: HomeDataShape = {
    trending: [],
    popularMovies: [],
    popularSeries: [],
    topRatedMovies: [],
    topRatedSeries: [],
    streamingServices: {},
    genres: [],
    anime: [],
    documentary: [],
  };

  homeData.trending = mergeCatalogItems(trendingMovies);
  homeData.popularMovies = mergeCatalogItems(popularMovies);
  homeData.popularSeries = mergeCatalogItems(popularSeries);

  homeData.topRatedMovies = sortTopRated(uniqueItems.filter(isMovie).filter(isValidImdbRating));
  homeData.topRatedSeries = sortTopRated(uniqueItems.filter(isSeries).filter(isValidImdbRating));

  for (const platformKey of Object.keys(PLATFORMS)) {
    const items = uniqueItems.filter(i => ((i.platforms as string[]) || []).includes(platformKey));
    if (items.length > 0) homeData.streamingServices[platformKey] = items;
  }

  const genreSet = new Set<string>();
  for (const item of uniqueItems) {
    (item.genres || []).forEach(g => genreSet.add(g));
  }
  homeData.genres = ALL_GENRES.filter(g => genreSet.has(g));

  homeData.anime = uniqueItems.filter(i => isAnime(i));
  homeData.documentary = uniqueItems.filter(i => isDocumentary(i));

  return NextResponse.json({
    success: true,
    data: {
      ...homeData,
      pagination: {
        skip,
        limit,
        returned: allItems.length,
        uniqueReturned: uniqueItems.length,
        hasMore: uniqueItems.length >= PAGE_SIZE,
      },
      addonStats,
    },
  });
}
