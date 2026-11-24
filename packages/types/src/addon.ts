export interface AddonManifest {
  id: string;
  name: string;
  version: string;
  description?: string;
  logo?: string;
  background?: string;
  resources?: Array<string | { name: string; types?: string[]; idPrefixes?: string[] }>;
  types?: string[];
  catalogs?: Array<{ type: string; id: string; name?: string }>;
  idPrefixes?: string[];
}

export interface AddonMeta {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  logo?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  runtime?: string;
  cast?: string[];
  director?: string[];
  videos?: Array<{ id: string; title: string; season?: number; episode?: number; released?: string; thumbnail?: string }>;
}

export interface AddonStream {
  url?: string;
  ytId?: string;
  infoHash?: string;
  externalUrl?: string;
  name?: string;
  title?: string;
  description?: string;
  behaviorHints?: Record<string, unknown>;
}

export interface AddonSubtitle {
  id?: string;
  url: string;
  lang: string;
}

export interface CatalogItem {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  addonId?: string;
  addonName?: string;
}
