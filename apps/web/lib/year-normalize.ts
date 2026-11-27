import type { AddonCatalogItem } from "./addon-client";

export type ReleaseYear = number | null;

/**
 * Extract a numeric release year from various metadata fields.
 * Rules:
 * - Movies: check release_info, then year/releaseYear/release_date/released/premiered/date
 * - Series: check first_aired, then release_date/released/first_aired/premiered/date
 * - Prefer explicit numeric fields over descriptive text
 * - Handle numeric year, string year, and full date strings
 * - Return null if no valid year found
 */
export function extractYear(item: AddonCatalogItem): ReleaseYear {
  const raw = item as unknown as Record<string, unknown>;

  // Priority 1: explicit numeric fields (check all possible year fields)
  const yearFields = ["year", "releaseYear", "release_date", "released", "premiered", "first_aired", "date"];
  
  for (const field of yearFields) {
    const value = raw[field];
    if (value == null) continue;
    
    // Handle numeric values
    if (typeof value === "number") {
      if (Number.isInteger(value) && value > 1800 && value < 2100) return value;
      continue;
    }
    
    // Handle string values (year, date, or ISO date)
    if (typeof value === "string" && value.trim()) {
      const trimmed = value.trim();
      
      // Try parsing as full ISO date first (e.g., "2025-03-14", "2025-03-14T00:00:00Z")
      const isoMatch = trimmed.match(/^(\d{4})-\d{2}-\d{2}/);
      if (isoMatch) {
        const year = parseInt(isoMatch[1], 10);
        if (year > 1800 && year < 2100) return year;
      }
      
      // Try parsing as standalone year (numeric string)
      const num = parseInt(trimmed, 10);
      if (!isNaN(num) && num > 1800 && num < 2100 && trimmed.length <= 4) {
        return num;
      }
      
      // Try extracting year from date string with slashes or other separators
      const dateMatch = trimmed.match(/(\d{4})/);
      if (dateMatch) {
        const year = parseInt(dateMatch[1], 10);
        if (year > 1800 && year < 2100) return year;
      }
    }
  }

  // Priority 2: from releaseInfo string that contains year (e.g., "2024", "2024-2025")
  const releaseInfo = item.releaseInfo;
  if (typeof releaseInfo === "string" && releaseInfo.trim()) {
    const trimmed = releaseInfo.trim();
    
    // Try ISO date format first
    const isoMatch = trimmed.match(/^(\d{4})-\d{2}-\d{2}/);
    if (isoMatch) {
      const year = parseInt(isoMatch[1], 10);
      if (year > 1800 && year < 2100) return year;
    }
    
    // Extract standalone 4-digit year
    const yearMatch = trimmed.match(/\b(19|20)\d{2}\b/);
    if (yearMatch) {
      const year = parseInt(yearMatch[0], 10);
      if (year > 1800 && year < 2100) return year;
    }
  }

  // Priority 3: name contains a year (rare fallback, only if releaseInfo is missing)
  const name = item.name;
  if (typeof name === "string" && name.trim()) {
    const nameMatch = name.match(/\b(19|20)\d{2}\b/);
    if (nameMatch) {
      const year = parseInt(nameMatch[0], 10);
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

/**
 * Development diagnostics for catalog data.
 */
export function getCatalogDiagnostics(items: AddonCatalogItem[]): {
  total: number;
  withYear: number;
  withoutYear: number;
  yearCounts: Record<number, number>;
} {
  const yearCounts: Record<number, number> = {};
  let withYear = 0;
  let withoutYear = 0;
  
  for (const item of items) {
    const year = extractYear(item);
    if (year != null) {
      withYear++;
      yearCounts[year] = (yearCounts[year] || 0) + 1;
    } else {
      withoutYear++;
    }
  }
  
  return {
    total: items.length,
    withYear,
    withoutYear,
    yearCounts,
  };
}