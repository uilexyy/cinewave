"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";
import MovieCard, { MovieCardData } from "@/components/MovieCard";
import PlatformSelector from "@/components/PlatformSelector";
import { ALL_GENRES, PLATFORMS } from "@/lib/catalog-categories";
import { getAvailableYears, filterItemsByYear } from "@/lib/year-normalize";

interface DiscoverData {
  results: MovieCardData[];
  availablePlatforms: string[];
  availableGenres: string[];
  total: number;
}

function DiscoverContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [query, setQuery] = useState(searchParams.get("q") || "");
  const [type, setType] = useState(searchParams.get("type") || "all");
  const [platform, setPlatform] = useState(searchParams.get("platform") || "");
  const [genre, setGenre] = useState(searchParams.get("genre") || "");
  const [sort, setSort] = useState(searchParams.get("sort") || "popular");
  const [year, setYear] = useState<number | null>(() => {
    const y = searchParams.get("year");
    return y ? parseInt(y, 10) : null;
  });
  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);

  // Keep URL query params in sync with filters (after initial hydration)
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type !== "all") params.set("type", type);
    if (platform) params.set("platform", platform);
    if (genre) params.set("genre", genre);
    if (sort !== "popular") params.set("sort", sort);
    if (year !== null) params.set("year", String(year));
    const next = params.toString();
    if (next !== searchParams.toString()) {
      router.replace(`/discover${next ? `?${next}` : ""}`, { scroll: false });
    }
  }, [query, type, platform, genre, sort, year, router, searchParams]);

  // Main catalog fetch (year removed from dependencies for local-only filtering)
  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (type !== "all") params.set("type", type);
    if (platform) params.set("platform", platform);
    if (genre) params.set("genre", genre);
    if (sort !== "popular") params.set("sort", sort);
    // Year filter NOT sent to API as per requirement "Filter only currently loaded data"
    apiFetch<DiscoverData>(`catalog/discover?${params.toString()}`)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData({ results: [], availablePlatforms: [], availableGenres: [], total: 0 });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [query, type, platform, genre, sort]);

  const clear = () => {
    setQuery("");
    setType("all");
    setPlatform("");
    setGenre("");
    setSort("popular");
    setYear(null);
  };

  const hasFilters = Boolean(query || platform || genre || type !== "all" || sort !== "popular" || year !== null);

  // Filter and available years derived from current results
  const allResults = useMemo(() => data?.results || [], [data]);
  const availableYears = useMemo(() => getAvailableYears(allResults), [allResults]);
  const filteredResults = useMemo(() => (year != null ? filterItemsByYear(allResults, year) : allResults), [allResults, year]);

  return (
    <main className="main-content fade-in">
      <div className="page">
        <div className="section-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.5px" }}>Discover</h1>
            <p className="section-subtitle">Explore by streaming service, genre, or IMDb rating.</p>
          </div>
          <Link href="/search" className="section-link">Simple search &apos;+</Link>
        </div>

        <div className="search-bar" style={{ maxWidth: 560, marginBottom: 28 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search titles..." aria-label="Search" />
        </div>

        {/* A. Streaming Services */}
        <section className="section">
          <div className="section-header">
            <div><h2 className="section-title" style={{ fontSize: 18 }}>A. Streaming Services</h2><p className="section-subtitle">Inferred from catalog source, not verified streaming availability.</p></div>
          </div>
          <PlatformSelector selected={platform} onSelect={setPlatform} available={data?.availablePlatforms || Object.keys(PLATFORMS)} />
        </section>

        {/* B. Genres */}
        <section className="section">
          <div className="section-header">
            <div><h2 className="section-title" style={{ fontSize: 18 }}>B. Genres</h2><p className="section-subtitle">From add-on metadata. May combine with Movies / Series.</p></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`chip ${genre === "" ? "chip-active" : ""}`} onClick={() => setGenre("")}>All Genres</button>
            {ALL_GENRES.map((g) => (
              <button key={g} className={`chip ${genre === g ? "chip-active" : ""}`} onClick={() => setGenre(g)}>{g}</button>
            ))}
          </div>
        </section>

        {/* C. IMDb Top Rated */}
        <section className="section">
          <div className="section-header">
            <div><h2 className="section-title" style={{ fontSize: 18 }}>C. IMDb Top Rated</h2><p className="section-subtitle">Sorted by real IMDb rating from add-on metadata.</p></div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button className={`chip ${sort === "popular" ? "chip-active" : ""}`} onClick={() => setSort("popular")}>Popular</button>
            <button className={`chip ${sort === "top-rated" ? "chip-active" : ""}`} onClick={() => setSort("top-rated")}>IMDb Rating</button>
            <button className={`chip ${sort === "newest" ? "chip-active" : ""}`} onClick={() => setSort("newest")}>Newest</button>
            <button className={`chip ${sort === "name" ? "chip-active" : ""}`} onClick={() => setSort("name")}>Name</button>
          </div>
        </section>

        {/* D. Year Filter */}
        <section className="section">
          <div className="section-header">
            <div>
              <h2 className="section-title" style={{ fontSize: 18 }}>D. Year Filter</h2>
              <p className="section-subtitle">Filter movies and series by release year.</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <button
              key="all-years"
              type="button"
              className={`chip ${year === null ? "chip-active" : ""}`}
              onClick={() => setYear(null)}
              aria-pressed={year === null}
            >
              All Years
            </button>
            {availableYears.map((y) => (
              <button
                key={y}
                type="button"
                className={`chip ${year === y ? "chip-active" : ""}`}
                onClick={() => setYear(y)}
                aria-pressed={year === y}
              >
                {y}
              </button>
            ))}
            {hasFilters && (
              <button className="btn btn-secondary btn-sm" onClick={clear}>
                Reset All Filters
              </button>
            )}
          </div>
        </section>

        {/* Type + clear */}
        <section className="section">
          <div className="section-header">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button className={`chip ${type === "all" ? "chip-active" : ""}`} onClick={() => setType("all")}>All</button>
              <button className={`chip ${type === "movie" ? "chip-active" : ""}`} onClick={() => setType("movie")}>Movies</button>
              <button className={`chip ${type === "series" ? "chip-active" : ""}`} onClick={() => setType("series")}>Series</button>
            </div>
            {hasFilters && <button className="btn btn-secondary btn-sm" onClick={clear}>Clear Filters</button>}
          </div>
        </section>

        <section className="section">
          <div className="section-header">
            <div><h2 className="section-title">Results</h2>{data && <p className="section-subtitle">{filteredResults.length} titles</p>}</div>
          </div>
          {loading && (
            <div className="card-grid">
              {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton skeleton-poster" />)}
            </div>
          )}
          {!loading && filteredResults.length === 0 && (
            <div className="empty-state">
              <h3>No Results</h3>
              <p>{year !== null ? `No titles from year ${year}. Try clearing the year filter.` : "No titles match these filters. Try clearing filters or installing more add-ons."}</p>
              {year !== null && (
                <button className="btn btn-secondary btn-sm" onClick={clear}>Reset Year Filter</button>
              )}
            </div>
          )}
          {!loading && filteredResults.length > 0 && (
            <div className="card-grid">
              {filteredResults.map((item) => <MovieCard key={`${item.type}:${item.id}`} item={item} showMeta />)}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

export default function DiscoverPage() {
  return (
    <Suspense fallback={
      <main className="main-content">
        <div className="page">
          <div className="skeleton" style={{ height: 40, width: 200, marginBottom: 20 }} />
          <div className="card-grid">
            {Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton skeleton-poster" />)}
          </div>
        </div>
      </main>
    }>
      <DiscoverContent />
    </Suspense>
  );
}