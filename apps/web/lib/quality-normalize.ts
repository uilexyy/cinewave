export type QualityBucket = "4K" | "1080p" | "720p" | "480p" | "Unknown";

export const QUALITY_OPTIONS: QualityBucket[] = ["4K", "1080p", "720p", "480p", "Unknown"];

const QUALITY_LABELS: Record<QualityBucket, string> = {
  "4K": "4K / UHD",
  "1080p": "1080p / Full HD",
  "720p": "720p / HD",
  "480p": "480p / SD",
  Unknown: "Unknown",
};

export function qualityLabel(q: QualityBucket): string {
  return QUALITY_LABELS[q];
}

function extractText(stream: {
  quality?: string;
  resolution?: string;
  name?: string;
  title?: string;
  description?: string;
  behaviorHints?: Record<string, unknown>;
}): string {
  const parts: string[] = [];
  const explicit = [stream.quality, stream.resolution];
  for (const v of explicit) {
    if (typeof v === "string" && v.trim()) parts.push(v.trim());
  }
  // Only fall back to name/title/description if no explicit quality/resolution
  if (parts.length === 0) {
    for (const v of [stream.name, stream.title, stream.description]) {
      if (typeof v === "string" && v.trim()) parts.push(v.trim());
    }
    const hints = stream.behaviorHints;
    if (hints) {
      for (const key of ["quality", "resolution", "videoQuality"]) {
        const v = hints[key];
        if (typeof v === "string" && v.trim()) parts.push(v.trim());
      }
    }
  }
  return parts.join(" ").toLowerCase();
}

export function normalizeQuality(stream: {
  quality?: string;
  resolution?: string;
  name?: string;
  title?: string;
  description?: string;
  behaviorHints?: Record<string, unknown>;
}): QualityBucket {
  const explicit = [stream.quality, stream.resolution]
    .filter((v): v is string => typeof v === "string" && v.trim().length > 0)
    .join(" ")
    .toLowerCase();

  // Prioritize explicit quality/resolution fields
  if (explicit) {
    if (/2160|4k|uhd|2160p/.test(explicit)) return "4K";
    if (/1080|full\s*hd|fhd|1080p/.test(explicit)) return "1080p";
    if (/720|hd\b|720p/.test(explicit)) return "720p";
    if (/480|sd\b|480p/.test(explicit)) return "480p";
  }

  // Fall back to name/title/description only if explicit is missing
  const fallbackText = extractText(stream);
  if (fallbackText && !explicit) {
    // Only look for explicit resolution patterns, not bare "HD" in addon names
    if (/\b(2160p?|4k|uhd)\b/.test(fallbackText)) return "4K";
    if (/\b(1080p?|full\s*hd|fhd)\b/.test(fallbackText)) return "1080p";
    if (/\b(720p?)\b/.test(fallbackText)) return "720p";
    if (/\b(480p?)\b/.test(fallbackText)) return "480p";
  }

  return "Unknown";
}