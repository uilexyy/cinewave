export interface CatalogIdentity {
  id: string;
  type: string;
}

const METADATA_FIELDS = [
  "name",
  "poster",
  "posterShape",
  "background",
  "logo",
  "description",
  "releaseInfo",
  "imdbRating",
  "runtime",
] as const;

export function catalogItemScore(item: CatalogIdentity): number {
  const raw = item as unknown as Record<string, unknown>;
  let score = 0;
  for (const field of METADATA_FIELDS) {
    const value = raw[field];
    if (typeof value === "string" && value.trim() !== "") score += 1;
  }
  if (Array.isArray(raw.genres)) score += raw.genres.length;
  return score;
}

export function catalogIdentity(item: CatalogIdentity): string {
  return `${item.type}:${item.id}`;
}

export function dedupeCatalogItems<T extends CatalogIdentity>(items: T[]): T[] {
  const best = new Map<string, T>();
  for (const item of items) {
    const key = catalogIdentity(item);
    const previous = best.get(key);
    if (!previous || catalogItemScore(item) > catalogItemScore(previous)) {
      best.set(key, item);
    }
  }
  return Array.from(best.values());
}
