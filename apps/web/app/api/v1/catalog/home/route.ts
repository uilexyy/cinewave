import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonCatalog } from "@/lib/addon-client";
import type { AddonCatalogItem } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";
import { catalogIdentity, catalogItemScore, mergeCatalogItems, CatalogSourceRef } from "@/lib/catalog";
import { PLATFORMS, getPlatformFromCatalogId, sortTopRated, isAnime, isDocumentary, normalizeGenres, ALL_GENRES, isValidImdbRating } from "@/lib/catalog-categories";

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

  type HomeItem = AddonCatalogItem & { addonId?: string; addonName?: string; platform?: string; catalogId?: string };
  const allItems: HomeItem[] = [];

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
      continue;
    }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) {
      console.error(`[catalog-home] Invalid manifest for addon "${addon.name}":`, result.errors);
      continue;
    }

    const catalogs = result.manifest.catalogs || [];

    for (const cat of catalogs) {
      try {
        const items = await fetchAddonCatalog(manifestUrl, result.manifest, cat.type, cat.id);
        const platform = getPlatformFromCatalogId(cat.id);
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

          // Populate sections from their dedicated add-on catalogs (no fabricated ordering)
          if (trendingCatalogIds.includes(cat.id)) trendingMovies.push(enrichedItem);
          else if (popularMovieCatalogIds.includes(cat.id)) popularMovies.push(enrichedItem);
          else if (popularSeriesCatalogIds.includes(cat.id)) popularSeries.push(enrichedItem);
        }
      } catch (err: unknown) {
        console.error(`[catalog-home] Failed to fetch catalog from "${addon.name}" (${cat.type}:${cat.id}):`, err instanceof Error ? err.message : String(err));
      }
    }
  }

  // Deduplicate globally by content identity (type:id), keeping richest metadata
  // while preserving platform/catalog source attribution for streaming services.
  const uniqueItems = mergeCatalogItems(allItems);


  // Helpers
  const isMovie = (i: HomeItem) => i.type === "movie" || i.type === "film";
  const isSeries = (i: HomeItem) => i.type === "series" || i.type === "tv" || i.type === "show";

  // Map into home sections
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

  homeData.trending = mergeCatalogItems(trendingMovies).slice(0, 20);
  homeData.popularMovies = mergeCatalogItems(popularMovies).slice(0, 20);
  homeData.popularSeries = mergeCatalogItems(popularSeries).slice(0, 20);


  // Top rated by IMDb rating (only items with rating)
  homeData.topRatedMovies = sortTopRated(uniqueItems.filter(isMovie).filter(isValidImdbRating)).slice(0, 20);
  homeData.topRatedSeries = sortTopRated(uniqueItems.filter(isSeries).filter(isValidImdbRating)).slice(0, 20);

  // Streaming services: group by platform (only platforms with content)
  for (const platformKey of Object.keys(PLATFORMS)) {
    const items = uniqueItems.filter(i => ((i.platforms as string[]) || []).includes(platformKey));
    if (items.length > 0) homeData.streamingServices[platformKey] = items;
  }

  // Genres: list unique normalized genres present
  const genreSet = new Set<string>();
  for (const item of uniqueItems) {
    (item.genres || []).forEach(g => genreSet.add(g));
  }
  homeData.genres = ALL_GENRES.filter(g => genreSet.has(g));

  // Anime & Documentary
  homeData.anime = uniqueItems.filter(i => isAnime(i)).slice(0, 20);
  homeData.documentary = uniqueItems.filter(i => isDocumentary(i)).slice(0, 20);

  return NextResponse.json({ success: true, data: homeData });
}
