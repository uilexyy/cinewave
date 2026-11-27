import type { AddonCatalogItem } from "./addon-client";

export type CountryCode = string | null;

export interface NormalizedCountry {
  code: string;
  name: string;
}

// ISO 3166-1 alpha-2 code → display name mapping
const COUNTRY_NAMES: Record<string, string> = {
  ID: "Indonesia",
  US: "United States",
  GB: "United Kingdom",
  JP: "Japan",
  KR: "South Korea",
  CN: "China",
  FR: "France",
  DE: "Germany",
  IT: "Italy",
  ES: "Spain",
  BR: "Brazil",
  IN: "India",
  PH: "Philippines",
  TH: "Thailand",
  VN: "Vietnam",
  MY: "Malaysia",
  SG: "Singapore",
  AU: "Australia",
  CA: "Canada",
  MX: "Mexico",
  AR: "Argentina",
  RU: "Russia",
  TR: "Turkey",
  NL: "Netherlands",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  PL: "Poland",
  PT: "Portugal",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  EG: "Egypt",
  NG: "Nigeria",
  ZA: "South Africa",
  NZ: "New Zealand",
  TW: "Taiwan",
  HK: "Hong Kong",
};

// Country name → ISO code mapping (reverse lookup)
const NAME_TO_CODE: Record<string, string> = {};
for (const [code, name] of Object.entries(COUNTRY_NAMES)) {
  NAME_TO_CODE[name.toLowerCase()] = code;
  NAME_TO_CODE[code.toLowerCase()] = code;
}

// Common ISO 3166-1 alpha-3 codes → alpha-2
const ALPHA3_TO_ALPHA2: Record<string, string> = {
  IDN: "ID",
  USA: "US",
  GBR: "GB",
  JPN: "JP",
  KOR: "KR",
  CHN: "CN",
  FRA: "FR",
  DEU: "DE",
  ITA: "IT",
  ESP: "ES",
  BRA: "BR",
  IND: "IN",
  PHL: "PH",
  THA: "TH",
  VNM: "VN",
  MYS: "MY",
  SGP: "SG",
  AUS: "AU",
  CAN: "CA",
  MEX: "MX",
  ARG: "AR",
  RUS: "RU",
  TUR: "TR",
  NLD: "NL",
  SWE: "SE",
  NOR: "NO",
  DNK: "DK",
  FIN: "FI",
  POL: "PL",
  PRT: "PT",
  SAU: "SA",
  ARE: "AE",
  EGY: "EG",
  NGA: "NG",
  ZAF: "ZA",
  NZL: "NZ",
  TWN: "TW",
  HKG: "HK",
};

/**
 * Normalize a single country value (string, number, object) to ISO 3166-1 alpha-2 code.
 */
export function normalizeSingleCountry(value: unknown): string | null {
  if (value == null) return null;

  // Handle string values
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;

    // Check if it's a country code (2-3 letters)
    const upper = trimmed.toUpperCase();
    if (/^[A-Z]{2}$/.test(upper) && COUNTRY_NAMES[upper]) {
      return upper;
    }
    if (/^[A-Z]{3}$/.test(upper) && ALPHA3_TO_ALPHA2[upper]) {
      return ALPHA3_TO_ALPHA2[upper];
    }

    // Check if it's a country name
    const code = NAME_TO_CODE[trimmed.toLowerCase()];
    if (code) return code;

    // Unknown country — don't guess, return null
    return null;
  }

  // Handle number (could be country code as number, unlikely but safe)
  if (typeof value === "number") {
    return null;
  }

  // Handle object with country name/code
  if (typeof value === "object" && value !== null) {
    const obj = value as Record<string, unknown>;
    // Common fields: name, code, iso_3166_1, iso_code, country_code
    for (const field of ["code", "iso_code", "country_code", "iso_3166_1", "iso_3166_1_alpha_2", "name", "country", "country_name"]) {
      const val = obj[field];
      if (val != null) {
        const result = normalizeSingleCountry(val);
        if (result) return result;
      }
    }
    // Handle "name" with "code" nested
    if (obj.name && obj.iso_3166_1) {
      const result = normalizeSingleCountry(obj.iso_3166_1);
      if (result) return result;
    }
    return null;
  }

  return null;
}

/**
 * Extract all normalized country codes from an item's metadata.
 * Supports: country, countries, countryCode, originCountry, productionCountries,
 * production_countries, origin_country
 */
export function extractCountries(item: AddonCatalogItem): string[] {
  const raw = item as unknown as Record<string, unknown>;
  const countryFields = [
    "country",
    "countries",
    "countryCode",
    "country_code",
    "originCountry",
    "origin_country",
    "productionCountries",
    "production_countries",
    "productionCountry",
    "production_country",
  ];

  const codes = new Set<string>();

  for (const field of countryFields) {
    const value = raw[field];
    if (value == null) continue;

    if (Array.isArray(value)) {
      for (const v of value) {
        const code = normalizeSingleCountry(v);
        if (code) codes.add(code);
      }
    } else {
      const code = normalizeSingleCountry(value);
      if (code) codes.add(code);
    }
  }

  return Array.from(codes);
}

/**
 * Get display name for a country code.
 */
export function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code;
}

/**
 * Get available country options from catalog data.
 * Indonesia is always first (if present), then others alphabetically.
 */
export function getAvailableCountries(items: AddonCatalogItem[]): NormalizedCountry[] {
  const codeSet = new Set<string>();
  for (const item of items) {
    for (const code of extractCountries(item)) {
      codeSet.add(code);
    }
  }
  const codes = Array.from(codeSet);
  // Indonesia first, then alphabetical by name
  codes.sort((a, b) => {
    if (a === "ID") return -1;
    if (b === "ID") return 1;
    return getCountryName(a).localeCompare(getCountryName(b));
  });
  return codes.map(code => ({ code, name: getCountryName(code) }));
}

/**
 * Filter items by a target country code.
 * Items with multiple countries match if any matches.
 * Items with no country metadata are excluded when a specific country is selected.
 * Items with no country metadata ARE included when "All Countries" is selected.
 */
export function filterItemsByCountry(items: AddonCatalogItem[], targetCode: string | null): AddonCatalogItem[] {
  if (targetCode == null) return items;
  return items.filter((item) => extractCountries(item).includes(targetCode));
}

/**
 * Check if an item is from Indonesia.
 */
export function isIndonesian(item: AddonCatalogItem): boolean {
  return extractCountries(item).includes("ID");
}
