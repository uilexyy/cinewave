"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { apiFetch, apiPost } from "@/services/api";
import { setPendingPlayback } from "@/lib/playback-store";

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
  videos?: Array<{ id: string; title: string; season?: number; episode?: number; released?: string; thumbnail?: string }>;
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

interface Subtitle {
  id?: string;
  language?: string;
  format?: string;
  url?: string;
  source?: string;
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
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingStreams, setIsLoadingStreams] = useState(true);
  const [streamError, setStreamError] = useState("");
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(true);
  const [subtitleError, setSubtitleError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setLoading(true); setError(""); } });
    const qs = `type=${encodeURIComponent(type)}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;
    const fallback = fallbackMetaFromParams(searchParams, id, type, addonId);

    apiFetch<Meta>(`catalog/title/${id}?${qs}`)
      .then((m) => { if (!cancelled) setMeta(m); })
      .catch(() => { if (!cancelled && fallback) setMeta(fallback); })
      .finally(() => { if (!cancelled) setLoading(false); });

    queueMicrotask(() => { setIsLoadingStreams(true); setStreamError(""); });
    apiFetch<{ sources: Stream[] }>(`playback/${id}?${qs}`)
      .then((s) => { if (cancelled) return; setStreams(s.sources || []); })
      .catch((e: unknown) => { if (cancelled) return; setStreamError(e instanceof Error ? e.message : "Failed to load streams"); })
      .finally(() => { if (!cancelled) setIsLoadingStreams(false); });

    queueMicrotask(() => { setIsLoadingSubtitles(true); setSubtitleError(""); });
    apiFetch<{ subtitles: Subtitle[] }>(`playback/${id}/subtitles?${qs}`)
      .then((s) => { if (cancelled) return; setSubtitles((s.subtitles || []).filter((t): t is Subtitle => !!t && !!t.url)); })
      .catch((e: unknown) => { if (cancelled) return; setSubtitleError(e instanceof Error ? e.message : "Failed to load subtitles"); })
      .finally(() => { if (!cancelled) setIsLoadingSubtitles(false); });

    return () => { cancelled = true; };
  }, [id, type, addonId, searchParams]);

  async function handlePlay(stream: Stream) {
    try { await apiPost("playback/sessions", { titleId: id, sourceId: stream.id }); } catch {}
    if (stream.sourceUrl) {
      setPendingPlayback({ src: stream.sourceUrl, title: meta?.name || "", titleId: id, subtitles: [] });
      router.push(`/player?src=${encodeURIComponent(stream.sourceUrl)}&title=${encodeURIComponent(meta?.name || "")}&titleId=${encodeURIComponent(id || "")}${type ? `&type=${encodeURIComponent(type)}` : ""}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`);
    } else if (stream.externalUrl) {
      window.open(stream.externalUrl, "_blank");
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
              {!isLoadingStreams && streams.length > 0 && <span className="small dim">{streams.length} available</span>}
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
            ) : streams.length === 0 ? (
              <div className="empty-state">
                <h3>No Streams Available</h3>
                <p>No playable sources found for this title.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {streams.map((s) => (
                  <div key={s.id} className="source-card">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 className="source-card-title">{s.name || s.quality || "Source"}</h3>
                      <div className="source-card-badges">
                        <span className="small dim">{s.providerName || "Unknown provider"}</span>
                        {s.quality && <span className="badge" style={{ padding: "2px 8px", fontSize: 11 }}>{s.quality}</span>}
                        {s.format && <span className="badge" style={{ padding: "2px 8px", fontSize: 11 }}>{s.format.toUpperCase()}</span>}
                        {s.isPlayable ? <span className="badge badge-ok" style={{ padding: "2px 8px", fontSize: 11 }}>PLAYABLE</span> : <span className="badge" style={{ padding: "2px 8px", fontSize: 11 }}>EXTERNAL</span>}
                      </div>
                    </div>
                    <button className="btn btn-primary" onClick={() => handlePlay(s)}>Play</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="section-header">
              <h2 className="section-title" style={{ fontSize: 18 }}>Subtitles</h2>
            </div>
            <div className="card">
              {isLoadingSubtitles ? (
                <p className="small dim">Loading subtitles...</p>
              ) : subtitleError ? (
                <p className="small" style={{ color: "var(--danger)" }}>{subtitleError}</p>
              ) : subtitles.length === 0 ? (
                <p className="small dim">No subtitles available</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {subtitles.map((sub, i) => (
                    <span key={sub.id || i} className="chip" style={{ fontSize: 12, padding: "6px 12px" }}>
                      {sub.language || "Unknown"}
                      {sub.source && <span style={{ opacity: 0.6, marginLeft: 6, fontSize: 10 }}>{sub.source}</span>}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
