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
  const [meta, setMeta] = useState<Meta | null>(null);
  const [streams, setStreams] = useState<Stream[]>([]);
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!id) return;
    queueMicrotask(() => setLoading(true));
    const qs = `type=${encodeURIComponent(type)}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;
    apiFetch<Meta>(`catalog/title/${id}?${qs}`)
      .then((m) => {
        setMeta(m);
        return apiFetch<{ sources: Stream[]; subtitles: Subtitle[] }>(`playback/${id}?${qs}`);
      })
      .then((s) => {
        setStreams(s.sources || []);
        setSubtitles((s.subtitles || []).filter((t): t is Subtitle => !!t && !!t.url));
      })
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [id, type, addonId]);

  async function handlePlay(stream: Stream) {
    try {
      await apiPost("playback/sessions", { titleId: id, sourceId: stream.id });
    } catch {}
    if (stream.sourceUrl) {
      setPendingPlayback({
        src: stream.sourceUrl,
        title: meta?.name || "",
        titleId: id,
        subtitles: subtitles.map((s) => ({ url: s.url || "", lang: s.language || "en" })).filter((s) => !!s.url),
      });
      router.push(
        `/player?src=${encodeURIComponent(stream.sourceUrl)}&title=${encodeURIComponent(meta?.name || "")}&titleId=${encodeURIComponent(id || "")}${type ? `&type=${encodeURIComponent(type)}` : ""}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`
      );
    } else if (stream.externalUrl) {
      window.open(stream.externalUrl, "_blank");
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  if (error || !meta) {
    return (
      <div style={{ display: "flex", minHeight: "100vh" }}>
        <aside className="sidebar">
          <span className="logo" style={{ fontSize: 24 }}>CineWave</span>
          <Link href="/home">Home</Link>
        </aside>
        <main className="main-content fade-in">
          <div className="empty-state">
            <h3>Content Not Found</h3>
            <p>{error || "This title could not be found in any installed add-on."}</p>
            <Link className="btn btn-primary" href="/home">
              Back to Home
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="sidebar">
        <span className="logo" style={{ fontSize: 24 }}>CineWave</span>
        <Link href="/home">Home</Link>
        <Link href="/search">Search</Link>
        <Link href="/watchlist">Watchlist</Link>
        <Link href="/history">History</Link>
        <Link href="/addons">Add-ons</Link>
        <Link href="/profile">Profile</Link>
      </aside>
      <main className="main-content fade-in">
        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 32, marginBottom: 32 }}>
          <div>
            {meta.poster ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={meta.poster} alt={meta.name} style={{ width: "100%", borderRadius: "var(--radius)" }} />
            ) : (
              <div style={{ aspectRatio: "2/3", background: "var(--surface-2)", borderRadius: "var(--radius)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                No Poster
              </div>
            )}
          </div>
          <div>
            <h1 style={{ fontSize: 36, fontWeight: 800, marginBottom: 8 }}>{meta.name}</h1>
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {meta.releaseInfo && <span className="badge">{meta.releaseInfo}</span>}
              {meta.imdbRating && <span className="badge">⭐ {meta.imdbRating}</span>}
              {meta.genres?.map((g) => (
                <span key={g} className="badge">{g}</span>
              ))}
              {meta.addonName && <span className="badge" style={{ borderColor: "var(--accent)", color: "#C4B5FD" }}>{meta.addonName}</span>}
            </div>
            <p style={{ color: "var(--text-muted)", lineHeight: 1.7, marginBottom: 24 }}>{meta.description}</p>
            {meta.cast && meta.cast.length > 0 && (
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 24 }}>
                <strong style={{ color: "var(--text)" }}>Cast:</strong> {meta.cast.slice(0, 5).join(", ")}
              </p>
            )}
          </div>
        </div>

        <h2 style={{ fontSize: 22, fontWeight: 700, marginBottom: 16 }}>Sources</h2>
        {streams.length === 0 ? (
          <div className="empty-state">
            <h3>No Streams Available</h3>
            <p>No playable sources found for this title.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {streams.map((s) => (
              <div key={s.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 15, marginBottom: 4 }}>{s.name || s.quality || "Source"}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 12 }}>
                    {s.providerName} {s.isPlayable ? "· Playable" : "· External"}
                  </p>
                </div>
                <button className="btn btn-primary" onClick={() => handlePlay(s)} style={{ padding: "8px 18px" }}>
                  Play
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
