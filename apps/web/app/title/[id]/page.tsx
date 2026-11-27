"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, apiPost } from "@/services/api";
import { setPendingPlayback } from "@/lib/playback-store";
import StreamSourceSelector, { StreamSource } from "@/components/StreamSourceSelector";
import { normalizeQuality, QUALITY_OPTIONS, qualityLabel, type QualityBucket } from "@/lib/quality-normalize";

interface Meta {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  cast?: string[];
  director?: string[];
  videos?: Array<{ id: string; title: string; season?: number; episode?: number; released?: string; thumbnail?: string; description?: string }>;
  app_extras?: { ratings?: { imdb?: { rating?: string; votes?: number | string } } };
  addonId?: string;
  addonName?: string;
}

interface Stream {
  id: string;
  sourceUrl?: string;
  format?: string;
  quality?: string;
  providerName?: string;
  isPlayable?: boolean;
  externalUrl?: string | null;
  name?: string;
  title?: string;
  description?: string;
}

interface SeriesEpisode {
  id: string;
  title: string;
  season?: number;
  episode?: number;
  released?: string;
  thumbnail?: string;
  description?: string;
}

function fallbackMetaFromParams(params: { get: (k: string) => string | null }, id: string, type: string, addonId: string): Meta | null {
  const name = params.get("name") || "";
  if (!name) return null;
  return {
    id, type, name,
    poster: params.get("poster") || undefined,
    background: params.get("background") || undefined,
    addonId: addonId || undefined,
    addonName: params.get("addonName") || undefined,
    releaseInfo: params.get("releaseInfo") || undefined,
    imdbRating: params.get("imdbRating") || undefined,
    genres: params.get("genres")?.split(",").filter(Boolean),
    description: params.get("description") || undefined,
  };
}

function EpisodeCard({ episode, isActive, onClick }: { episode: SeriesEpisode; isActive: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`episode-card ${isActive ? "active" : ""}`}
      style={{ display: "flex", gap: 16, padding: 12, borderRadius: 8, background: "var(--surface)", border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`, textAlign: "left", width: "100%", transition: "all 0.2s" }}
    >
      <div style={{ width: 120, height: 68, background: "var(--surface-2)", borderRadius: 4, overflow: "hidden", flexShrink: 0 }}>
        {episode.thumbnail ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={episode.thumbnail} alt={episode.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-dim)" }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15l4-4 4 4"/></svg>
          </div>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-muted)", marginBottom: 2 }}>S{episode.season} E{episode.episode}</div>
        <div className="episode-card-title">{episode.title}</div>
        {episode.description && <p style={{ fontSize: 13, color: "var(--text-dim)", margin: 0, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{episode.description}</p>}
      </div>
    </button>
  );
}

export default function TitleDetailPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <TitleContent />
    </Suspense>
  );
}

function TitleContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const type = searchParams.get("type") || "movie";
  const addonId = searchParams.get("addonId") || "";
  const [meta, setMeta] = useState<Meta | null>(() => fallbackMetaFromParams(searchParams, id, type, addonId));
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [streamError, setStreamError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const [selectedSeason, setSelectedSeason] = useState<number>(1);
  const [selectedEpisode, setSelectedEpisode] = useState<SeriesEpisode | null>(null);

  const [selectedStream, setSelectedStream] = useState<Stream | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityBucket | "All">("All");

  // Group videos by season
  const seasons = meta?.videos?.reduce((acc, v) => {
    const s = v.season || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(v as SeriesEpisode);
    return acc;
  }, {} as Record<number, SeriesEpisode[]>) || {};

  const seasonNumbers = Object.keys(seasons).map(Number).sort((a, b) => a - b);
  const activeEpisodes = seasons[selectedSeason] || [];

  // If first render and no episode selected, default to first episode of selected season
  // Handled inside the initial fetch success callback to avoid cascading renders.

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setError(""); } });
    const qs = `type=${encodeURIComponent(type)}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;
    const fallback = fallbackMetaFromParams(searchParams, id, type, addonId);

    apiFetch<Meta>(`catalog/title/${id}?${qs}`)
      .then((m) => { 
        if (!cancelled) { 
          setMeta(m);
          if (m?.type === "series" && m.videos && m.videos.length > 0) {
            const first = m.videos[0];
            setSelectedSeason(first.season || 1);
            setSelectedEpisode(first as SeriesEpisode);
          }
        } 
      })
      .catch(() => { if (!cancelled && fallback) setMeta(fallback); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [id, type, addonId, searchParams]);

  // Fetch streams and subtitles based on active ID (series episode ID or movie ID)
  useEffect(() => {
    const activeId = type === "series" && selectedEpisode ? selectedEpisode.id : id;
    if (!activeId) return;
    let cancelled = false;

    queueMicrotask(() => { setIsLoadingStreams(true); setStreamError(""); });
    const qs = `type=${encodeURIComponent(type)}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;

    apiFetch<{ sources: Stream[] }>(`playback/${activeId}?${qs}`)
      .then((s) => { if (cancelled) return; setStreams(s.sources || []); })
      .catch((e: unknown) => { if (cancelled) return; setStreamError(e instanceof Error ? e.message : "Failed to load streams"); })
      .finally(() => { if (!cancelled) setIsLoadingStreams(false); });



    return () => { cancelled = true; };
  }, [id, type, addonId, selectedEpisode]);

  async function handlePlay(stream: Stream, episode?: SeriesEpisode | null) {
    const ep = episode !== undefined ? episode : (type === "series" ? selectedEpisode : null);
    try {
      await apiPost("playback/sessions", {
        titleId: type === "series" ? id : id,
        episodeId: type === "series" && ep ? ep.id : null,
        season: type === "series" && ep ? ep.season : null,
        episode: type === "series" && ep ? ep.episode : null,
        episodeTitle: type === "series" && ep ? ep.title : null,
        sourceId: stream.id,
        sourceUrl: stream.sourceUrl,
        format: stream.format,
        quality: stream.quality,
        addonId: addonId
      });
    } catch (e) {
      console.error("Session creation failed", e);
    }
    if (stream.sourceUrl) {
      const playTitle = type === "series" && ep ? `${meta?.name} - ${ep.title}` : (meta?.name || "");
      const playId = type === "series" && ep ? ep.id : id;
      setPendingPlayback({ src: stream.sourceUrl, title: playTitle, titleId: playId, subtitles: [] });
      const episodeParams = type === "series" && ep
        ? `&seriesId=${encodeURIComponent(id || "")}&season=${encodeURIComponent(String(ep.season || 1))}&episode=${encodeURIComponent(String(ep.episode || 1))}&episodeTitle=${encodeURIComponent(ep.title || "")}`
        : "";
      router.push(`/player?src=${encodeURIComponent(stream.sourceUrl)}&title=${encodeURIComponent(playTitle)}&titleId=${encodeURIComponent(playId || "")}${type ? `&type=${encodeURIComponent(type)}` : ""}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}${episodeParams}`);
    } else if (stream.externalUrl) {
      window.open(stream.externalUrl, "_blank");
    }
  }

  async function handlePlayEpisode(ep: SeriesEpisode) {
    setSelectedEpisode(ep);
    setSelectedStream(null);
    setStreams([]);
    const qs = `type=${encodeURIComponent(type)}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;
    try {
      const s = await apiFetch<{ sources: Stream[] }>(`playback/${ep.id}?${qs}`);
      setStreams(s.sources || []);
      setStreamError("");
    } catch (e: unknown) {
      setStreams([]);
      setStreamError(e instanceof Error ? e.message : "Failed to load streams");
    }
  }

  if (loading && !meta) {
    return (
      <main className="main-content">
        <div className="loading"><div className="spinner" /></div>
      </main>
    );
  }

  if (error || !meta) {
    return (
      <main className="main-content fade-in">
        <div className="empty-state">
          <h3>Content Not Found</h3>
          <p>{error || "This title could not be found in any installed add-on."}</p>
          <Link className="btn btn-primary" href="/home">Back to Home</Link>
        </div>
      </main>
    );
  }

  const backdrop = meta.background || meta.poster;

  function filteredStreams(list: Stream[]): Stream[] {
    if (qualityFilter === "All") return list;
    return list.filter((s) => normalizeQuality(s) === qualityFilter);
  }



  // For movie, render existing movie layout unchanged
  if (type !== "series") {
    return (
      <main className="main-content fade-in">
        <div className="page">
          <div className="detail-hero">
            <div className="detail-backdrop">
              {backdrop && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={backdrop} alt="" aria-hidden="true" style={{ filter: "brightness(0.45) saturate(1.05)", transform: "scale(1.02)" }} />
              )}
            </div>
            <div className="detail-fade" />
            <div className="detail-body">
              <div>
                {meta.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={meta.poster} alt={meta.name} className="detail-poster" loading="lazy" />
                ) : (
                  <div className="detail-poster-fallback">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M7 8h10M7 12h7"/></svg>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {meta.releaseInfo && <span className="badge">{meta.releaseInfo}</span>}
                  {meta.imdbRating && <span className="badge badge-imdb">IMDb {meta.imdbRating}{meta.app_extras?.ratings?.imdb?.votes ? ` (${meta.app_extras.ratings.imdb.votes.toLocaleString()} votes)` : ""}</span>}
                  {meta.genres?.slice(0, 4).map((g) => <span key={g} className="badge">{g}</span>)}
                  {meta.addonName && <span className="badge" style={{ borderColor: "rgba(99,102,241,0.4)", color: "#A5B4FC" }}>{meta.addonName}</span>}
                </div>
                <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px" }}>{meta.name}</h1>
                <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.75, maxWidth: 760 }}>{meta.description || "No description available."}</p>
                <div style={{ display: "flex", gap: 24, flexWrap: "wrap", color: "var(--text-dim)", fontSize: 13 }}>
                  {meta.cast && meta.cast.length > 0 && <span><strong style={{ color: "var(--text-muted)" }}>Cast:</strong> {meta.cast.slice(0, 5).join(", ")}</span>}
                  {meta.director && meta.director.length > 0 && <span><strong style={{ color: "var(--text-muted)" }}>Director:</strong> {meta.director.join(", ")}</span>}
                </div>
              </div>
            </div>
          </div>

          <div className="detail-grid">
            <div>
              <div className="section-header">
                <h2 className="section-title">Sources</h2>
                {!isLoadingStreams && filteredStreams(streams).length > 0 && <span className="small dim">{filteredStreams(streams).length} available</span>}
              </div>

              {isLoadingStreams ? (
                <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)" }}>
                  <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                  Loading streams...
                </div>
              ) : streamError ? (
                <div className="error-state">
                  <h3>Stream Error</h3>
                  <p>{streamError}</p>
                  <button className="btn btn-secondary btn-sm" onClick={() => window.location.reload()}>Retry</button>
                </div>
              ) : filteredStreams(streams).length === 0 ? (
                <div className="empty-state">
                  <h3>No Streams Available</h3>
                  <p>{qualityFilter !== "All" ? "No streams available for the selected quality." : "No playable sources found for this title."}</p>
                  {qualityFilter !== "All" && (
                    <button className="btn btn-secondary btn-sm" onClick={() => setQualityFilter("All")}>Reset Filter</button>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div className="quality-filter" role="group" aria-label="Filter by video quality">
                    {(["All", ...QUALITY_OPTIONS] as Array<QualityBucket | "All">).map((q) => (
                      <button key={q} type="button" className={`quality-chip ${qualityFilter === q ? "active" : ""}`} onClick={() => setQualityFilter(q)} aria-pressed={qualityFilter === q}>
                        {q === "All" ? "All" : qualityLabel(q)}
                      </button>
                    ))}
                    {qualityFilter !== "All" && (
                      <button type="button" className="quality-reset" onClick={() => setQualityFilter("All")}>Reset Filter</button>
                    )}
                  </div>
                  <StreamSourceSelector
                streams={filteredStreams(streams) as StreamSource[]}
                selectedId={null}
                onSelect={() => {}}
                onPlay={(s) => handlePlay(s as Stream)}
              />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Series layout (new cinematic two-column layout)
  const episodeCount = meta.videos?.length || 0;
  const seasonCount = seasonNumbers.length;

  return (
    <main className="main-content fade-in">
      <div className="page">
        <div className="detail-hero" style={{ minHeight: 400, background: `linear-gradient(180deg, transparent 0%, var(--bg) 100%), url(${backdrop}) center/cover` }}>
          <div className="detail-backdrop">
            {backdrop && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={backdrop} alt="" aria-hidden="true" style={{ filter: "brightness(0.45) saturate(1.05)", transform: "scale(1.02)" }} />
            )}
          </div>
          <div className="detail-fade" />
          <div className="detail-body">
            <div>
              {meta.poster ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={meta.poster} alt={meta.name} className="detail-poster" loading="lazy" />
              ) : (
                <div className="detail-poster-fallback">
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2"><rect x="2.5" y="4.5" width="19" height="15" rx="2"/><path d="M7 8h10M7 12h7"/></svg>
                </div>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 16, paddingTop: 8 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {meta.releaseInfo && <span className="badge">{meta.releaseInfo}</span>}
                {meta.imdbRating && <span className="badge badge-imdb">IMDb {meta.imdbRating}{meta.app_extras?.ratings?.imdb?.votes ? ` (${meta.app_extras.ratings.imdb.votes.toLocaleString()} votes)` : ""}</span>}
                {meta.genres?.slice(0, 4).map((g) => <span key={g} className="badge">{g}</span>)}
                {meta.addonName && <span className="badge" style={{ borderColor: "rgba(99,102,241,0.4)", color: "#A5B4FC" }}>{meta.addonName}</span>}
              </div>
              <h1 style={{ fontSize: "clamp(32px, 5vw, 56px)", fontWeight: 800, lineHeight: 1.05, letterSpacing: "-1px" }}>{meta.name}</h1>
              <p style={{ color: "var(--text-muted)", fontSize: 15, lineHeight: 1.75, maxWidth: 760 }}>{meta.description || "No description available."}</p>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", color: "var(--text-dim)", fontSize: 13 }}>
                {meta.cast && meta.cast.length > 0 && <span><strong style={{ color: "var(--text-muted)" }}>Cast:</strong> {meta.cast.slice(0, 5).join(", ")}</span>}
                {meta.director && meta.director.length > 0 && <span><strong style={{ color: "var(--text-muted)" }}>Director:</strong> {meta.director.join(", ")}</span>}
                {seasonCount > 0 && <span><strong style={{ color: "var(--text-muted)" }}>Seasons:</strong> {seasonCount}</span>}
                {episodeCount > 0 && <span><strong style={{ color: "var(--text-muted)" }}>Episodes:</strong> {episodeCount}</span>}
              </div>
            </div>
          </div>
        </div>

        <div className="detail-grid series-detail-grid">
          <div>
            <div className="section-header">
              <h2 className="section-title" style={{ fontSize: 18 }}>Seasons</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {seasonNumbers.map((season) => (
                <button
                  key={season}
                  onClick={() => setSelectedSeason(season)}
                  className={`chip ${selectedSeason === season ? "chip-active" : ""}`}
                  style={{ justifyContent: "space-between", display: "flex", padding: "12px 16px", width: "100%" }}
                >
                  <span style={{ fontWeight: 600 }}>Season {season}</span>
                  <span style={{ color: "var(--text-muted)", fontSize: 13 }}>{seasons[season].length} episodes</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="section-header">
              <h2 className="section-title" style={{ fontSize: 18 }}>Episodes</h2>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {activeEpisodes.map((ep) => (
                <EpisodeCard
                  key={ep.id}
                  episode={ep}
                  isActive={selectedEpisode?.id === ep.id}
                  onClick={() => handlePlayEpisode(ep)}
                />
              ))}
            </div>
            {selectedEpisode && (
              <div style={{ marginTop: 24 }}>
                {isLoadingStreams ? (
                  <div className="card" style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--text-muted)" }}>
                    <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
                    Loading streams...
                  </div>
                ) : filteredStreams(streams).length === 0 ? (
                  <div className="empty-state">
                    <h3>No Streams Available</h3>
                    <p>{qualityFilter !== "All" ? "No streams available for the selected quality." : "No playable sources found for this episode."}</p>
                    {qualityFilter !== "All" && (
                      <button className="btn btn-secondary btn-sm" onClick={() => setQualityFilter("All")}>Reset Filter</button>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="quality-filter" role="group" aria-label="Filter by video quality">
                      {(["All", ...QUALITY_OPTIONS] as Array<QualityBucket | "All">).map((q) => (
                        <button key={q} type="button" className={`quality-chip ${qualityFilter === q ? "active" : ""}`} onClick={() => setQualityFilter(q)} aria-pressed={qualityFilter === q}>
                          {q === "All" ? "All" : qualityLabel(q)}
                        </button>
                      ))}
                      {qualityFilter !== "All" && (
                        <button type="button" className="quality-reset" onClick={() => setQualityFilter("All")}>Reset Filter</button>
                      )}
                    </div>
                    <StreamSourceSelector
                      streams={filteredStreams(streams) as StreamSource[]}
                      selectedId={selectedStream?.id || null}
                      onSelect={(s) => setSelectedStream(s as Stream)}
                      onPlay={(s) => handlePlay(s as Stream, selectedEpisode)}
                    />
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
