"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";
import MovieCard, { MovieCardData } from "@/components/MovieCard";
import { dedupeCatalogItems } from "@/lib/catalog";
import { PLATFORMS } from "@/lib/catalog-categories";
import { getAvailableYears, filterItemsByYear } from "@/lib/year-normalize";

interface HistoryItem {
  id: string;
  titleId: string;
  title: string;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

function SectionRow({ title, subtitle, items, action }: { title: string; subtitle?: string; items: MovieCardData[]; action?: React.ReactNode }) {
  if (items.length === 0) return null;
  return (
    <section className="section">
      <div className="section-header">
        <div>
          <h2 className="section-title">{title}</h2>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="row-scroll">
        {items.map((item, i) => (
          <div key={`${item.type}:${item.id}-${i}`} className="row-item">
            <MovieCard item={item} />
          </div>
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const [groups, setGroups] = useState<Record<string, MovieCardData[]>>({});
  const [streamingServices, setStreamingServices] = useState<Record<string, MovieCardData[]>>({});
  const [genres, setGenres] = useState<string[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAddons, setHasAddons] = useState(true);
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [category, setCategory] = useState<"all" | "movie" | "series">("all");
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    apiFetch("auth/me").catch(() => { if (!cancelled) router.push("/login"); });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    apiFetch<any>("catalog/home")
      .then((data) => {
        if (cancelled) return;
        const services: Record<string, MovieCardData[]> = {};
        for (const [key, items] of Object.entries((data.streamingServices || {}) as Record<string, MovieCardData[]>)) {
          const deduped = dedupeCatalogItems(items as MovieCardData[]);
          if (deduped.length > 0) services[key] = deduped;
        }
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
        if (
          !(data.trending?.length) &&
          !(data.popularMovies?.length) &&
          !(data.popularSeries?.length) &&
          !(data.topRatedMovies?.length) &&
          !(data.topRatedSeries?.length)
        ) setHasAddons(false);
      })
      .catch(() => { if (!cancelled) setHasAddons(false); })
      .finally(() => { if (!cancelled) setLoading(false); });

    apiFetch<HistoryItem[]>("history")
      .then((h) => { if (!cancelled) setHistory(h); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [router]);

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

  const filterByYear = (list: MovieCardData[]) => {
    if (selectedYear == null) return list;
    return filterItemsByYear(list, selectedYear);
  };

  const filterByCategory = (list: MovieCardData[]) => {
    if (category === "all") return list;
    const isMovie = category === "movie";
    return list.filter((i) => (i.type === "movie" || i.type === "film") ? isMovie : !isMovie);
  };

  const processItems = (list: MovieCardData[]) => {
    return filterByYear(filterByCategory(list || []));
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
  const hasFilters = selectedYear != null || category !== "all";

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
                  >
                    All Years
                  </button>
                  {availableYears.map((y) => (
                    <button
                      key={y}
                      className={`chip ${selectedYear === y ? "chip-active" : ""}`}
                      onClick={() => setSelectedYear(y)}
                    >
                      {y}
                    </button>
                  ))}
                  {hasFilters && (
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => { setSelectedYear(null); setCategory("all"); }}
                      style={{ marginLeft: 8 }}
                    >
                      Reset
                    </button>
                  )}
                </div>
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

          <SectionRow title={category === "series" ? "Trending Series" : "Trending Movies"} items={processItems(groups.trending)} />
          <SectionRow title="Popular Movies" items={processItems(groups.popularMovies)} />
          <SectionRow title="Popular Series" items={processItems(groups.popularSeries)} />

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

          <SectionRow title="IMDb Top Rated Movies" items={processItems(groups.topRatedMovies)} action={!hasFilters && <Link href="/discover?sort=top-rated&type=movie" className="section-link">See all</Link>} />
          <SectionRow title="IMDb Top Rated Series" items={processItems(groups.topRatedSeries)} action={!hasFilters && <Link href="/discover?sort=top-rated&type=series" className="section-link">See all</Link>} />
          <SectionRow title="Anime" items={processItems(groups.anime)} />
          <SectionRow title="Documentary" items={processItems(groups.documentary)} />

          {Object.values(groups).every((g) => processItems(g).length === 0) && !loading && hasAddons && (
            <div className="empty-state">
              <h3>No titles found for this filter</h3>
              <p>Try a different year or category.</p>
              <button className="btn btn-secondary" onClick={() => { setSelectedYear(null); setCategory("all"); }}>Reset Filters</button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
