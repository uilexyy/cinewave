import assert from "node:assert/strict";
import { extractCountries, filterItemsByCountry, getAvailableCountries, isIndonesian } from "../lib/country-normalize";
import type { AddonCatalogItem } from "../lib/addon-client";

async function runTests() {
  console.log("Starting Country Normalize Tests...");

  // Test 1: string country "Indonesia"
  {
    const item = { id: "1", type: "movie", name: "Test", country: "Indonesia" } as AddonCatalogItem;
    assert.deepEqual(extractCountries(item), ["ID"]);
  }

  // Test 2: country code "ID"
  {
    const item = { id: "1", type: "movie", name: "Test", country: "ID" } as AddonCatalogItem;
    assert.deepEqual(extractCountries(item), ["ID"]);
  }

  // Test 3: alpha-3 code "IDN"
  {
    const item = { id: "1", type: "movie", name: "Test", countryCode: "IDN" } as AddonCatalogItem;
    assert.deepEqual(extractCountries(item), ["ID"]);
  }

  // Test 4: array of strings
  {
    const item = { id: "1", type: "movie", name: "Test", countries: ["Indonesia", "Japan"] } as AddonCatalogItem;
    assert.deepEqual(extractCountries(item), ["ID", "JP"]);
  }

  // Test 5: object array (productionCountries)
  {
    const item = {
      id: "1", type: "movie", name: "Test",
      productionCountries: [
        { name: "Indonesia", iso_3166_1: "ID" },
        { name: "United States", iso_3166_1: "US" },
      ],
    } as AddonCatalogItem;
    assert.deepEqual(extractCountries(item), ["ID", "US"]);
  }

  // Test 6: missing country
  {
    const item = { id: "1", type: "movie", name: "Test" } as AddonCatalogItem;
    assert.deepEqual(extractCountries(item), []);
  }

  // Test 7: invalid country
  {
    const item = { id: "1", type: "movie", name: "Test", country: "X" } as AddonCatalogItem;
    assert.deepEqual(extractCountries(item), []);
  }

  // Test 8: isIndonesian
  {
    const item = { id: "1", type: "movie", name: "Test", country: "ID" } as AddonCatalogItem;
    assert.equal(isIndonesian(item), true);
    const item2 = { id: "2", type: "movie", name: "Test", country: "US" } as AddonCatalogItem;
    assert.equal(isIndonesian(item2), false);
  }

  // Test 9: filterItemsByCountry
  {
    const items = [
      { id: "1", type: "movie", name: "Indo Movie", country: "ID" },
      { id: "2", type: "movie", name: "US Movie", country: "US" },
    ] as AddonCatalogItem[];
    const filtered = filterItemsByCountry(items, "ID");
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].name, "Indo Movie");
  }

  // Test 10: getAvailableCountries - Indonesia first
  {
    const items = [
      { id: "1", type: "movie", name: "Indo Movie", country: "ID" },
      { id: "2", type: "movie", name: "JP Movie", country: "JP" },
    ] as AddonCatalogItem[];
    const countries = getAvailableCountries(items);
    assert.equal(countries[0].code, "ID");
    assert.equal(countries[0].name, "Indonesia");
  }

  // Test 11: multiple production countries
  {
    const item = { id: "1", type: "movie", name: "Co-production", country: ["ID", "US"] } as AddonCatalogItem;
    const countries = extractCountries(item);
    assert.ok(countries.includes("ID"));
    assert.ok(countries.includes("US"));
  }

  console.log("All Country Normalize Tests Passed!");
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
