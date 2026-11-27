"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";
import MovieCard, { MovieCardData } from "@/components/MovieCard";
import { dedupeCatalogItems } from "@/lib/catalog";
import { PLATFORMS } from "@/lib/catalog-categories";

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

  return (
    <>
      <main className="main-content fade-in">
        <div className="page">
          {/* 1. Featured / Hero */}
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
                  {hero.releaseInfo && <span className="badge">📅 {hero.releaseInfo}</span>}
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
                    ▶ Watch Now
                  </Link>
                  <Link className="btn btn-secondary btn-lg" href={`/title/${encodeURIComponent(hero.id)}?${new URLSearchParams({
                    type: hero.type, addonId: hero.addonId || "", name: hero.name || "", poster: hero.poster || "", background: hero.background || "",
                    addonName: hero.addonName || "", releaseInfo: hero.releaseInfo || "", imdbRating: hero.imdbRating || "",
                    genres: (hero.genres || []).join(","), description: hero.description || "",
                  }).toString()}`}>
                    More Info
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

          {/* 2. Continue Watching */}
          {history.length > 0 && (
            <section className="section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Continue Watching</h2>
                  <p className="section-subtitle">Jump back into your recently watched titles</p>
                </div>
                <Link href="/history" className="section-link">View history →</Link>
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

          {/* 3. Streaming Services */}
          {Object.keys(streamingServices).length > 0 && (
            <section className="section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Streaming Services</h2>
                  <p className="section-subtitle">Browse by platform (inferred from catalog source, not verified streaming availability)</p>
                </div>
                <Link href="/discover" className="section-link">All platforms →</Link>
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

          <SectionRow title="Trending Movies" subtitle="Popular right now across your add-ons" items={groups.trending?.filter(i => i.type === "movie" || i.type === "film") || []} />
          <SectionRow title="Popular Movies" items={groups.popularMovies || []} />
          <SectionRow title="Popular Series" items={groups.popularSeries || []} />

          {/* 7. Genres */}
          {genres.length > 0 && (
            <section className="section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">Genres</h2>
                  <p className="section-subtitle">From your add-on metadata</p>
                </div>
                <Link href="/discover" className="section-link">Explore →</Link>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {genres.map((g) => (
                  <Link key={g} href={`/discover?genre=${encodeURIComponent(g)}`} className="genre-chip">{g}</Link>
                ))}
              </div>
            </section>
          )}

          {/* 8. IMDb Top Rated Movies */}
          <SectionRow title="IMDb Top Rated Movies" subtitle="Sorted by real IMDb rating from add-on metadata" items={groups.topRatedMovies || []} action={<Link href="/discover?sort=top-rated&type=movie" className="section-link">See all →</Link>} />
          {/* 9. IMDb Top Rated Series */}
          <SectionRow title="IMDb Top Rated Series" subtitle="Sorted by real IMDb rating from add-on metadata" items={groups.topRatedSeries || []} action={<Link href="/discover?sort=top-rated&type=series" className="section-link">See all →</Link>} />

          {/* 10. Anime & Documentary */}
          <SectionRow title="Anime" items={groups.anime || []} />
          <SectionRow title="Documentary" items={groups.documentary || []} />

          {Object.values(groups).every((g) => g.length === 0) && !loading && (
            <div className="empty-state">
              <h3>No Content Available</h3>
              <p>Install an add-on to populate your catalog.</p>
              <Link className="btn btn-primary" href="/addons">Go to Add-ons</Link>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
