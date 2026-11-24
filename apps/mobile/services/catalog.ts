const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export interface CatalogItem {
  id: string;
  type: string;
  title: string;
  posterUrl: string | null;
  rating?: number;
  addonId?: string;
  addonName?: string;
}

export async function fetchCatalogHome(token?: string | null): Promise<CatalogItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/catalog/home`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    if (json.success && json.data) {
      const all = [
        ...(json.data.trending || []),
        ...(json.data.popularMovies || []),
        ...(json.data.popularSeries || []),
        ...(json.data.topRatedMovies || []),
        ...(json.data.topRatedSeries || []),
      ];
      return all as CatalogItem[];
    }
    return [];
  } catch {
    return [];
  }
}

export async function fetchSearch(query: string, token?: string | null): Promise<CatalogItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/catalog/search?q=${encodeURIComponent(query)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    if (json.success && json.data?.results) {
      return json.data.results as CatalogItem[];
    }
    return [];
  } catch {
    return [];
  }
}
