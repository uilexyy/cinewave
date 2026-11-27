import type { AddonCatalogItem } from "./addon-client";

export const PLATFORMS = {
  netflix: { name: "Netflix", logo: "N", color: "#E50914", catalogIds: ["netflix-movies", "netflix-series"] },
  prime: { name: "Prime Video", logo: "P", color: "#00A8E1", catalogIds: ["prime-video-movies", "prime-video-series"] },
  disney: { name: "Disney+", logo: "D", color: "#0063E5", catalogIds: ["disney-plus-movies", "disney-plus-series"] },
  hbo: { name: "Max / HBO", logo: "M", color: "#0047FF", catalogIds: ["max-movies", "max-series", "hbo-movies", "hbo-series"] },
  apple: { name: "Apple TV+", logo: "A", color: "#FFFFFF", catalogIds: ["apple-tv-movies", "apple-tv-series"] },
  hulu: { name: "Hulu", logo: "H", color: "#1CE783", catalogIds: ["hulu-movies", "hulu-series"] },
  paramount: { name: "Paramount+", logo: "P+", color: "#0064FF", catalogIds: ["paramount-plus-movies", "paramount-plus-series"] },
  peacock: { name: "Peacock", logo: "P", color: "#FFD000", catalogIds: ["peacock-movies", "peacock-series"] },
};

export const GENRE_MAP: Record<string, string> = {
  "Cerita Fiksi": "Sci-Fi",
  "Aksi": "Action",
  "Petualangan": "Adventure",
  "Komedi": "Comedy",
  "Keluarga": "Family",
  "Drama": "Drama",
  "Animasi": "Animation",
  "Kriminal": "Crime",
  "Dokumenter": "Documentary",
  "Fantasi": "Fantasy",
  "Sejarah": "History",
  "Horor": "Horror",
  "Musik": "Music",
  "Misteri": "Mystery",
  "Romansa": "Romance",
  "Cerita Seru": "Thriller",
  "Perang": "War",
  "Barat": "Western",
  "Science Fiction": "Sci-Fi",
  "Action & Adventure": "Action",
  "Soap": "Drama",
  "Reality": "Documentary",
};

export const ALL_GENRES = [
  "Action", "Adventure", "Animation", "Comedy", "Crime", "Documentary", "Drama", "Family",
  "Fantasy", "History", "Horror", "Music", "Mystery", "Romance", "Sci-Fi", "Thriller", "War", "Western",
];

export function normalizeGenre(genre: string): string {
  return GENRE_MAP[genre] || genre;
}

export function normalizeGenres(genres: string[] | undefined): string[] {
  if (!Array.isArray(genres)) return [];
  const normalized = genres.map(normalizeGenre).filter(Boolean);
  return Array.from(new Set(normalized));
}

export function getImdbRating(item: AddonCatalogItem): number | null {
  const raw = item.imdbRating || item.app_extras?.ratings?.imdb?.rating;
  if (raw === undefined || raw === null) return null;
  const num = parseFloat(String(raw));
  if (Number.isNaN(num) || num < 0 || num > 10) return null;
  return num;
}

export function isValidImdbRating(item: AddonCatalogItem): boolean {
  return getImdbRating(item) !== null;
}

export function getPlatformFromCatalogId(catalogId: string): string | null {
  for (const [key, platform] of Object.entries(PLATFORMS)) {
    if (platform.catalogIds.includes(catalogId)) return key;
  }
  return null;
}

export function getImdbVotes(item: AddonCatalogItem): number {
  const votes = item.app_extras?.ratings?.imdb?.votes;
  if (typeof votes === "number") return votes;
  if (typeof votes === "string") return parseInt(votes.replace(/,/g, "")) || 0;
  return 0;
}

export function sortTopRated<T extends AddonCatalogItem>(items: T[]): T[] {
  return [...items]
    .filter((i) => getImdbRating(i) !== null)
    .sort((a, b) => {
      const rA = getImdbRating(a) ?? 0;
      const rB = getImdbRating(b) ?? 0;
      if (rB !== rA) return rB - rA;
      return getImdbVotes(b) - getImdbVotes(a);
    });
}

export function isAnime(item: AddonCatalogItem): boolean {
  const genres = (item.genres || []).map(normalizeGenre);
  return genres.includes("Animation") && (item.name?.toLowerCase().includes("anime") || genres.includes("Anime"));
}

export function isDocumentary(item: AddonCatalogItem): boolean {
  const genres = (item.genres || []).map(normalizeGenre);
  return genres.includes("Documentary");
}