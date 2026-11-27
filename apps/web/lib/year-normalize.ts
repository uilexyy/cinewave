import type { AddonCatalogItem } from "./addon-client";

export type ReleaseYear = number | null;

/**
 * Extract a numeric release year from various metadata fields.
 * Rules:
 * - Movies: check release_info, then year/releaseYear/release_date/released/premiered
 * - Series: check first_aired, then release_date/released/first_aired/premiered
 * - Prefer explicit numeric fields over descriptive text
 * - Return null if no valid year found
 */
export function extractYear(item: AddonCatalogItem): ReleaseYear {
  // Priority 1: explicit numeric fields
  for (const field of ["year", "releaseYear", "release_date", "released", "premiered", "first_aired"]) {
    const raw = (item as unknown as Record<string, unknown>)[field];
    if (typeof raw === "number" && Number.isInteger(raw) && raw > 1800 && raw < 2100) return raw;
    if (typeof raw === "string") {
      const num = parseInt(raw, 10);
      if (!isNaN(num) && num > 1800 && num < 2100) return num;
    }
  }

  // Priority 2: from releaseInfo string that contains year (e.g., "2024", "2024–2025")
  const releaseInfo = item.releaseInfo;
  if (typeof releaseInfo === "string" && releaseInfo.trim()) {
    // Extract year pattern - standalone 4-digit year
    const yearMatch = releaseInfo.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      // Only return if it's a standalone 4-digit year (not part of longer text that happens to have 4 digits)
      // Check that it's surrounded by non-alphanumeric or at word boundary
      if (year > 1800 && year < 2100) return year;
    }
  }

  // Priority 3: name contains a year (rare fallback)
  // Only if releaseInfo is absent/missing
  const name = item.name;
  if (typeof name === "string" && name.trim()) {
    const nameMatch = name.match(/\b(19|20)\d{2}\b/);
    if (nameMatch) {
      const year = parseInt(nameMatch[1] + nameMatch[2], 10);
      // Only consider name year if releaseInfo is missing
      if (releaseInfo == null || !releaseInfo.trim()) {
        if (year > 1800 && year < 2100) return year;
      }
    }
  }

  return null;
}

/**
 * Get available year options from catalog data.
 * Descending order, only years that have matching items.
 */
export function getAvailableYears(items: AddonCatalogItem[]): number[] {
  const yearSet = new Set<number>();
  for (const item of items) {
    const year = extractYear(item);
    if (year != null) yearSet.add(year);
  }
  return Array.from(yearSet).sort((a, b) => b - a); // descending
}

/**
 * Filter items by a target year.
 * Items with no year are excluded when a specific year is selected.
 * Items with no year ARE included when "All Years" is selected.
 */
export function filterItemsByYear(items: AddonCatalogItem[], targetYear: number | null): AddonCatalogItem[] {
  if (targetYear == null) return items;
  return items.filter((item) => extractYear(item) === targetYear);
}