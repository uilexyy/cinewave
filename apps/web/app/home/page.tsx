"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";
import { MovieCardData } from "@/components/MovieCard";
import { dedupeCatalogItems } from "@/lib/catalog";
import { PLATFORMS } from "@/lib/catalog-categories";
import { Carousel } from "@/components/Carousel";
import { getAvailableYears, filterItemsByYear, extractYear } from "@/lib/year-normalize";
import { getAvailableCountries, filterItemsByCountry, extractCountries } from "@/lib/country-normalize";

interface HistoryItem {
  id: string;
  titleId: string;
  title: string;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

export default function HomePage() {
  const [groups, setGroups] = useState<Record<string, MovieCardData[]>>({});
  const [streamingServices, setStreamingServices] = useState<Record<string, MovieCardData[]>>({});
  const [genres, setGenres] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [skip, setSkip] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasAddons, setHasAddons] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [category, setCategory] = useState<"all" | "movie" | "series">("all");
  const router = useRouter();

  const fetchHome = async (currentSkip: number, isMore: boolean) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = await apiFetch<any>(`catalog/home?skip=${currentSkip}`);
    const services: Record<string, MovieCardData[]> = {};
    for (const [key, items] of Object.entries((data.streamingServices || {}) as Record<string, MovieCardData[]>)) {
      const deduped = dedupeCatalogItems(items as MovieCardData[]);
      if (deduped.length > 0) services[key] = deduped;
    }
    
    if (isMore) {
      setGroups(prev => {
        const next = { ...prev };
        for (const key of Object.keys(data)) {
          if (Array.isArray(data[key])) {
            next[key] = dedupeCatalogItems([...(prev[key] || []), ...data[key]]);
          }
        }
        return next;
      });
      setStreamingServices(prev => ({ ...prev, ...services }));
      setHasMore(data.pagination.hasMore);
    } else {
      setStreamingServices(services);
      setGenres((data.genres || []) as string[]);
      setGroups({
        trending: dedupeCatalogItems(data.trending || []),
        popularMovies: dedupeCatalogItems(data.popularMovies || []),
        popularSeries: dedupeCatalogItems(data.popularSeries || []),
        topRatedMovies: dedupeCatalogItems(data.topRatedMovies || []),
        topRatedSeries: dedupeCatalogItems(data.topRatedSeries || []),
        anime: dedupeCatalogItems(data.anime || []),
        documentary: dedupeCatalogItems(data.documentary || []),
      });
      setHasMore(data.pagination.hasMore);
      if (
        !(data.trending?.length) && !(data.popularMovies?.length) && !(data.popularSeries?.length) &&
        !(data.topRatedMovies?.length) && !(data.topRatedSeries?.length)
      ) setHasAddons(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiFetch("auth/me").catch(() => { if (!cancelled) router.push("/login"); });
    queueMicrotask(() => {
      fetchHome(0, false)
        .then(() => { if (!cancelled) setLoading(false); })
        .catch(() => { if (!cancelled) setHasAddons(false); });
    });
    apiFetch<HistoryItem[]>("history")
      .then((h) => { if (!cancelled) setHistory(h); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [router]);

  const loadMore = async () => {
    setLoadingMore(true);
    const nextSkip = skip + 50;
    await fetchHome(nextSkip, true);
    setSkip(nextSkip);
    setLoadingMore(false);
  };

  const allItems = useMemo(() => {
    const list: MovieCardData[] = [];
    const seen = new Set<string>();
    for (const key of Object.keys(groups)) {
      const sectionItems = groups[key] || [];
      for (const item of sectionItems) {
        const identity = `${item.type}:${item.id}`;
        if (seen.has(identity)) continue;
        seen.add(identity);
        list.push(item);
      }
    }
    return list;
  }, [groups]);

  const availableYears = useMemo(() => {
    const filtered = category === "all" ? allItems : allItems.filter((i) => {
      const isMovie = i.type === "movie" || i.type === "film";
      return category === "movie" ? isMovie : !isMovie;
    });
    return getAvailableYears(filtered);
  }, [allItems, category]);

  const availableCountries = useMemo(() => {
    const filtered = category === "all" ? allItems : allItems.filter((i) => {
      const isMovie = i.type === "movie" || i.type === "film";
      return category === "movie" ? isMovie : !isMovie;
    });
    return getAvailableCountries(filtered);
  }, [allItems, category]);

  const filterByYear = (list: MovieCardData[]) => {
    if (selectedYear == null) return list;
    return filterItemsByYear(list, selectedYear);
  };

  const filterByCountry = (list: MovieCardData[]) => {
    if (selectedCountry == null) return list;
    return filterItemsByCountry(list, selectedCountry);
  };

  const filterByCategory = (list: MovieCardData[]) => {
    if (category === "all") return list;
    const isMovie = category === "movie";
    return list.filter((i) => (i.type === "movie" || i.type === "film") ? isMovie : !isMovie);
  };

  const processItems = (list: MovieCardData[]) => {
    return filterByCountry(filterByYear(filterByCategory(list || [])));
  };

  if (loading) {
    return (
      <main className="main-content fade-in">
        <div className="page">
          <div className="skeleton" style={{ height: 320, borderRadius: "var(--radius-lg)" }} />
          <div className="row-scroll" style={{ marginTop: 40 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="row-item"><div className="skeleton skeleton-poster" /></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  const hero = groups.trending?.[0] || groups.popularMovies?.[0] || groups.topRatedMovies?.[0] || null;
  const heroBackdrop = hero?.background || hero?.poster;
  const hasFilters = selectedYear != null || selectedCountry != null || category !== "all";

  return (
    <>
      <main className="main-content fade-in">
        <div className="page">
          {hero && (
            <div className="hero">
              <div className="hero-backdrop">
                {heroBackdrop && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={heroBackdrop} alt="" aria-hidden="true" style={{ filter: "brightness(0.55) blur(2px)", transform: "scale(1.04)" }} />
                )}
              </div>
              <div className="hero-fade" />
              <div className="hero-content">
                {hero.genres?.length ? (
                  <div className="hero-meta">
                    {hero.genres.slice(0, 3).map((g) => (
                      <span key={g} className="badge badge-accent">{g}</span>
                    ))}
                  </div>
                ) : null}
                <h1>{hero.name}</h1>
                <div className="hero-meta">
                  {hero.releaseInfo && <span className="badge">{hero.releaseInfo}</span>}
                  {hero.imdbRating && <span className="badge badge-imdb">IMDb {hero.imdbRating}</span>}
                  {hero.addonName && <span className="badge badge-accent">{hero.addonName}</span>}
                </div>
                {hero.description && <p className="hero-desc">{hero.description}</p>}
                <div className="hero-actions">
                  <Link className="btn btn-primary btn-lg" href={`/title/${encodeURIComponent(hero.id)}?${new URLSearchParams({
                    type: hero.type, addonId: hero.addonId || "", name: hero.name || "", poster: hero.poster || "", background: hero.background || "",
                    addonName: hero.addonName || "", releaseInfo: hero.releaseInfo || "", imdbRating: hero.imdbRating || "",
                    genres: (hero.genres || []).join(","), description: hero.description || "",
                  }).toString()}`}>
                    Watch Now
                  </Link>
                </div>
              </div>
            </div>
          )}

          {!hasAddons && (
            <div className="empty-state" style={{ marginTop: 40 }}>
              <h3>No Add-ons Installed</h3>
              <p>Install an add-on to populate your catalog and start streaming.</p>
              <Link className="btn btn-primary" href="/addons">Install Add-ons</Link>
            </div>
          )}

          {/* Catalog Filter Controls */}
          {hasAddons && (
            <section className="section" style={{ marginBottom: 32 }}>
              <div className="section-header">
                <div>
                  <h2 className="section-title" style={{ fontSize: 18 }}>Quick Filters</h2>
                  <p className="section-subtitle">Discover by category and release year</p>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className={`chip ${category === "all" ? "chip-active" : ""}`} onClick={() => setCategory("all")}>All Content</button>
                  <button className={`chip ${category === "movie" ? "chip-active" : ""}`} onClick={() => setCategory("movie")}>Movies Only</button>
                  <button className={`chip ${category === "series" ? "chip-active" : ""}`} onClick={() => setCategory("series")}>Series Only</button>
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    key="all-years"
                    className={`chip ${selectedYear === null ? "chip-active" : ""}`}
                    onClick={() => setSelectedYear(null)}
                    aria-pressed={selectedYear === null}
                  >
                    All Years
                  </button>
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      className={`chip ${selectedYear === y ? "chip-active" : ""}`}
                      onClick={() => setSelectedYear(y)}
                      aria-pressed={selectedYear === y}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <button
                    key="all-countries"
                    className={`chip ${selectedCountry === null ? "chip-active" : ""}`}
                    onClick={() => setSelectedCountry(null)}
                    aria-pressed={selectedCountry === null}
                  >
                    🌐 All Countries
                  </button>
                  <button
                    key="indonesia"
                    className={`chip ${selectedCountry === "ID" ? "chip-active" : ""}`}
                    onClick={() => setSelectedCountry("ID")}
                    aria-pressed={selectedCountry === "ID"}
                  >
                    🇮🇩 Indonesia
                  </button>
                  {availableCountries.filter((c) => c.code !== "ID").map((c) => (
                    <button
                      key={c.code}
                      className={`chip ${selectedCountry === c.code ? "chip-active" : ""}`}
                      onClick={() => setSelectedCountry(c.code)}
                      aria-pressed={selectedCountry === c.code}
                    >
                      {c.name}
                    </button>
                  ))}
                </div>
                {hasFilters && (
                  <div>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setSelectedYear(null); setSelectedCountry(null); setCategory("all"); }}
                    >
                      Reset
                    </button>
                  </div>
                )}
              </div>
            </section>
          )}

          {history.length > 0 && !hasFilters && (
            <section className="section">
              <div className="section-header">
                <div><h2 className="section-title">Continue Watching</h2></div>
                <Link href="/history" className="section-link">View history</Link>
              </div>
              <div className="row-scroll">
                {history.slice(0, 12).map((h) => {
                  const pct = h.durationSeconds > 0 ? Math.min(100, Math.round((h.positionSeconds / h.durationSeconds) * 100)) : 0;
                  return (
                    <Link key={h.id} href={`/title/${encodeURIComponent(h.titleId)}?name=${encodeURIComponent(h.title)}`} className="card card-hover" style={{ width: 240, flex: "0 0 auto", scrollSnapAlign: "start" }}>
                      <h3 style={{ fontSize: 14, marginBottom: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.title}</h3>
                      <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                      <p className="small dim" style={{ marginTop: 8 }}>{h.completed ? "Completed" : `${pct}% watched`}</p>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          {Object.keys(streamingServices).length > 0 && !hasFilters && (
            <section className="section">
              <div className="section-header">
                <div><h2 className="section-title">Streaming Services</h2></div>
                <Link href="/discover" className="section-link">All platforms</Link>
              </div>
              <div className="platform-selector">
                {Object.entries(streamingServices).map(([key, items]) => {
                  const p = (PLATFORMS as Record<string, { name: string; logo: string; color: string }>)[key];
                  if (!p) return null;
                  return (
                    <Link key={key} href={`/discover?platform=${key}`} className="platform-chip">
                      <span className="platform-logo" style={{ background: p.color, color: p.color === "#FFFFFF" ? "#000" : "#fff" }}>{p.logo}</span>
                      <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
                        <span style={{ fontSize: 13, fontWeight: 700 }}>{p.name}</span>
                        <span className="small dim">{items.length} titles</span>
                      </span>
                    </Link>
                  );
                })}
              </div>
            </section>
          )}

          <Carousel title={category === "series" ? "Trending Series" : "Trending Movies"} items={processItems(groups.trending)} />
          <Carousel title="Popular Movies" items={processItems(groups.popularMovies)} />
          <Carousel title="Popular Series" items={processItems(groups.popularSeries)} />

          {genres.length > 0 && !hasFilters && (
            <section className="section">
              <div className="section-header">
                <div><h2 className="section-title">Genres</h2></div>
                <Link href="/discover" className="section-link">Explore</Link>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {genres.map((g) => (
                  <Link key={g} href={`/discover?genre=${encodeURIComponent(g)}`} className="genre-chip">{g}</Link>
                ))}
              </div>
            </section>
          )}

          <Carousel title="IMDb Top Rated Movies" items={processItems(groups.topRatedMovies)} />
          <Carousel title="IMDb Top Rated Series" items={processItems(groups.topRatedSeries)} />
          <Carousel title="Anime" items={processItems(groups.anime)} />
          <Carousel title="Documentary" items={processItems(groups.documentary)} />

          {hasMore && hasAddons && !hasFilters && (
            <div style={{ textAlign: "center", margin: "40px 0" }}>
              <button className="btn btn-secondary btn-lg" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading more titles..." : "Load More Catalogs"}
              </button>
            </div>
          )}

          {process.env.NODE_ENV === "development" && (
            <section className="section" style={{ marginTop: 32, padding: 16, border: "1px dashed var(--border)", borderRadius: 8 }}>
              <h3 className="section-title" style={{ fontSize: 14 }}>Dev Diagnostics</h3>
              <p className="small dim">Total items: {allItems.length}</p>
              <p className="small dim">Movies: {allItems.filter(i => i.type === "movie" || i.type === "film").length}</p>
              <p className="small dim">Series: {allItems.filter(i => i.type === "series" || i.type === "tv" || i.type === "show").length}</p>
              <p className="small dim">With year: {allItems.filter(i => extractYear(i) != null).length}</p>
              <p className="small dim">Without year: {allItems.filter(i => extractYear(i) == null).length}</p>
              <p className="small dim">Indonesian items: {allItems.filter(i => extractCountries(i).includes("ID")).length}</p>
              <div style={{ marginTop: 8, fontSize: 11, color: "var(--text-dim)" }}>
                <strong>Raw country metadata sample:</strong>
                <ul style={{ paddingLeft: 16, margin: "4px 0" }}>
                  {allItems.slice(0, 5).map((i, idx) => {
                    const countries = extractCountries(i);
                    const raw: Record<string, unknown> = {};
                    ["country", "countries", "countryCode", "originCountry", "productionCountries"].forEach(f => {
                      const val = (i as unknown as Record<string, unknown>)[f];
                      if (val != null) raw[f] = val;
                    });
                    return (
                      <li key={String(idx)}>
                        {i.name}: {Object.keys(raw).length > 0 ? JSON.stringify(raw) : "none"} {countries.length > 0 ? `→ [${countries.join(", ")}]` : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
              <p className="small dim">
                Matching {selectedYear ?? "all"}: {selectedYear != null ? allItems.filter(i => extractYear(i) === selectedYear).length : allItems.length}
              </p>
            </section>
          )}

          {Object.values(groups).every((g) => processItems(g).length === 0) && !loading && hasAddons && (
            <div className="empty-state">
              <h3>No titles found for this filter</h3>
              <p>Try a different year, country, or category.</p>
              <button className="btn btn-secondary" onClick={() => { setSelectedYear(null); setSelectedCountry(null); setCategory("all"); }}>Reset Filters</button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
