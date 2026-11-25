"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/services/api";
import { clearPendingPlayback } from "@/lib/playback-store";

interface PlayerSubtitle {
  id?: string;
  url: string;
  blobUrl?: string;
  lang: string;
  source?: string;
}

function validateStreamUrl(raw: string): { ok: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "URL tidak valid" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, error: "Protokol stream tidak didukung (harus http/https)" };
  }
  return { ok: true };
}

function validateSubtitleUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function PlayerContent() {
  const params = useSearchParams();
  const router = useRouter();
  const src = params.get("src");
  const title = params.get("title") || "CineWave Player";
  const titleId = params.get("titleId") || undefined;
  const type = params.get("type") || "movie";

  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRefs = useRef<Map<string, HTMLTrackElement>>(new Map());
  const blobUrls = useRef<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subtitleTracks, setSubtitleTracks] = useState<PlayerSubtitle[]>([]);
  const [selectedSub, setSelectedSub] = useState<string>("off");
  const [subtitleError, setSubtitleError] = useState("");

  useEffect(() => {
    let cancelled = false;
    let hlsInstance: unknown = null;
    const video = videoRef.current;

    if (!video) return;

    async function init(v: HTMLVideoElement) {
      if (!src) {
        if (!cancelled) {
          setError("URL stream kosong");
          setLoading(false);
        }
        return;
      }

      const validation = validateStreamUrl(src);
      if (!validation.ok) {
        if (!cancelled) {
          setError(validation.error || "URL stream tidak valid");
          setLoading(false);
        }
        return;
      }

      if (titleId) {
        try {
          const data = await apiFetch<{
            subtitles?: Array<{
              id?: string;
              url?: string;
              lang?: string;
              content?: string;
              source?: string;
            }>;
          }>(`playback/${titleId}?type=${encodeURIComponent(type)}`);
          const subs: PlayerSubtitle[] = [];
          for (const s of data.subtitles || []) {
            if (!s?.lang) continue;
            const key = `${s.id || "sub"}-${s.lang}`;
            if (s.content) {
              const blobUrl = URL.createObjectURL(new Blob([s.content], { type: "text/vtt" }));
              blobUrls.current.set(key, blobUrl);
              subs.push({ id: s.id, url: "", blobUrl, lang: s.lang, source: s.source });
            } else if (s.url && validateSubtitleUrl(s.url)) {
              subs.push({ id: s.id, url: s.url, lang: s.lang, source: s.source });
            }
          }
          if (!cancelled) setSubtitleTracks(subs);
        } catch {
          // subtitle addons optional; playback must continue
        }
      }

      const isM3u8 = /\.m3u8(\?|$)/i.test(src);

      if (!isM3u8) {
        v.removeAttribute("crossorigin");
        v.src = src;
        v.load();
        v.play().catch(() => {});
        return;
      }

      const nativeSupported = v.canPlayType("application/vnd.apple.mpegurl") !== "";
      if (nativeSupported) {
        v.crossOrigin = "anonymous";
        v.src = src;
        v.load();
        v.play().catch(() => {});
        return;
      }

      if (!src.startsWith("http://") && !src.startsWith("https://")) {
        if (!cancelled) setError("URL HLS tidak didukung");
        return;
      }

      try {
        const mod = await import("hls.js");
        const Hls = mod.default;
        if (
          Hls &&
          typeof (Hls as { isSupported?: () => boolean }).isSupported === "function" &&
          (Hls as { isSupported?: () => boolean }).isSupported?.()
        ) {
          const HlsCtor = Hls as unknown as new () => {
            loadSource: (s: string) => void;
            attachMedia: (v: HTMLVideoElement) => void;
            destroy: () => void;
            on: (t: string, cb: (evt: unknown, data: { fatal?: boolean; type?: string }) => void) => void;
          };
          const h = new HlsCtor();
          hlsInstance = h;
          h.on("error", (_event, data) => {
            if (data?.fatal && !cancelled) setError(`HLS error: ${data.type || "unknown"}`);
          });
          h.on("manifestParsed", () => {
            if (!cancelled) {
              v.play().catch(() => {});
              setLoading(false);
            }
          });
          v.crossOrigin = "anonymous";
          h.loadSource(src);
          h.attachMedia(v);
          v.addEventListener("canplay", () => {
            if (!cancelled) setLoading(false);
          }, { once: true });
        } else {
          if (!cancelled) setError("Browser tidak mendukung HLS");
        }
      } catch {
        if (!cancelled) setError("Gagal memuat library HLS");
      }
    }

    void init(video);

    return () => {
      cancelled = true;
      clearPendingPlayback();
      const tracks = trackRefs.current;
      const blobs = blobUrls.current;
      tracks.clear();
      for (const url of blobs.values()) URL.revokeObjectURL(url);
      blobs.clear();
      if (hlsInstance) {
        try {
          (hlsInstance as { destroy: () => void }).destroy();
        } catch {
          // ignore
        }
      }
      if (video) {
        video.removeAttribute("src");
        video.load();
      }
    };
  }, [src, titleId, type]);

  useEffect(() => {
    const tracks = [...trackRefs.current.values()];
    for (const trackEl of tracks) {
      const textTrack = trackEl.track;
      if (!textTrack) continue;
      const active = selectedSub !== "off" && textTrack.language === selectedSub;
      textTrack.mode = active ? "showing" : "disabled";
    }
  }, [selectedSub, subtitleTracks]);

  const handleError = () => {
    if (!loading) return;
    setError("Terjadi kesalahan saat memuat stream video.");
    setLoading(false);
  };

  const handleCanPlay = () => setLoading(false);

  if (!src) {
    return (
      <div className="loading" style={{ minHeight: "100vh" }}>
        <p>No source provided.</p>
      </div>
    );
  }

  const validation = validateStreamUrl(src);

  if (!validation.ok) {
    return (
      <div className="loading" style={{ minHeight: "100vh" }}>
        <p style={{ color: "var(--danger)" }}>{validation.error}</p>
        <button className="btn btn-ghost" onClick={() => router.back()}>Kembali</button>
      </div>
    );
  }

  const selectedTrack = subtitleTracks.find((t) => t.lang === selectedSub);

  return (
    <div style={{ height: "100vh", background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="logo">CineWave</span>
        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
        {loading && !error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#000", zIndex: 2 }}>
            <div className="spinner" />
          </div>
        )}
        {error && (
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", gap: 16, alignItems: "center", justifyContent: "center", background: "#000", padding: 24, textAlign: "center", zIndex: 3 }}>
            <p style={{ color: "var(--danger)", maxWidth: 500 }}>{error}</p>
            <button className="btn btn-ghost" onClick={() => router.back()}>Kembali</button>
          </div>
        )}
        <video
          ref={videoRef}
          controls
          autoPlay
          playsInline
          muted
          onCanPlay={handleCanPlay}
          onError={handleError}
          style={{ width: "100%", maxWidth: "1200px", maxHeight: "100%", display: "block" }}
        >
          {subtitleTracks.map((t) => {
            const key = `${t.id || "sub"}-${t.lang}`;
            return (
              <track
                key={key}
                ref={(el) => {
                  if (el) trackRefs.current.set(key, el);
                }}
                src={t.blobUrl || t.url}
                srcLang={t.lang}
                label={t.lang}
                kind="subtitles"
                onError={() => {
                  if (t.lang === selectedSub) setSubtitleError(`Subtitle ${t.lang} gagal dimuat (CORS/format).`);
                }}
              />
            );
          })}
        </video>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 16px", background: "var(--surface)", width: "100%", maxWidth: "1200px", borderTop: "1px solid var(--border)" }}>
          <span style={{ color: "var(--text-muted)", fontSize: 13 }}>Subtitle</span>
          {subtitleTracks.length === 0 ? (
            <span style={{ color: "var(--text-dim)", fontSize: 13 }}>Subtitle tidak ditemukan</span>
          ) : (
            <>
              <select
                style={{ padding: "4px 8px", background: "var(--surface-2)", color: "var(--text)", border: "1px solid var(--border)", borderRadius: 4 }}
                value={selectedSub}
                onChange={(e) => {
                  setSelectedSub(e.target.value);
                  setSubtitleError("");
                }}
              >
                <option value="off">Off</option>
                {subtitleTracks.map((t) => (
                  <option key={`${t.id || "sub"}-${t.lang}`} value={t.lang}>
                    {t.lang}{t.source ? ` · ${t.source}` : ""}
                  </option>
                ))}
              </select>
              {selectedTrack?.source && (
                <span style={{ color: "var(--text-dim)", fontSize: 12 }}>Sumber: {selectedTrack.source}</span>
              )}
              {selectedSub !== "off" && selectedTrack && (
                <span style={{ color: "var(--success)", fontSize: 12 }}>Aktif</span>
              )}
            </>
          )}
          {subtitleError && <span style={{ color: "var(--danger)", fontSize: 12 }}>{subtitleError}</span>}
        </div>
      </div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <PlayerContent />
    </Suspense>
  );
}
