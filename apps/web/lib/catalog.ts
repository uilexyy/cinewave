import { getPlatformFromCatalogId } from "./catalog-categories";

export interface CatalogIdentity {
  id: string;
  type: string;
}

export interface CatalogSourceRef {
  addonId?: string;
  addonName?: string;
  catalogId?: string;
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

const SOURCE_KEY = (r: CatalogSourceRef) => `${r.addonId ?? ""}:${r.catalogId ?? ""}`;

export function mergeCatalogItems<T extends { type: string; id: string; platform?: string; catalogId?: string; addonId?: string; addonName?: string; sources?: CatalogSourceRef[] }>(
  items: T[]
): Array<T & { platforms: string[]; sources: CatalogSourceRef[] }> {
  const best = new Map<string, T>();
  const platformsByKey = new Map<string, Set<string>>();
  const sourcesByKey = new Map<string, CatalogSourceRef[]>();

  for (const item of items) {
    const key = catalogIdentity(item as CatalogIdentity);
    const refs: CatalogSourceRef[] = item.sources ?? [{ addonId: item.addonId, addonName: item.addonName, catalogId: item.catalogId }];
    
    const prevSources = sourcesByKey.get(key) ?? [];
    const mergedSources = [...prevSources, ...refs.filter((r) => !prevSources.some((p) => SOURCE_KEY(p) === SOURCE_KEY(r)))];
    sourcesByKey.set(key, mergedSources);

    const platSet = platformsByKey.get(key) ?? new Set<string>();
    if (item.platform) platSet.add(item.platform);
    for (const r of refs) { if (r.catalogId) { const p = getPlatformFromCatalogId(r.catalogId); if (p) platSet.add(p); } }
    platformsByKey.set(key, platSet);

    const prev = best.get(key);
    if (!prev || catalogItemScore(item as CatalogIdentity) > catalogItemScore(prev as CatalogIdentity)) {
      best.set(key, item);
    }
  }

  return Array.from(best.values()).map((item) => ({
    ...item,
    platforms: Array.from(platformsByKey.get(catalogIdentity(item as CatalogIdentity)) ?? []),
    sources: sourcesByKey.get(catalogIdentity(item as CatalogIdentity)) ?? [],
  }));
}

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
