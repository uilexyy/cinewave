"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/services/api";
import { clearPendingPlayback } from "@/lib/playback-store";
import { normalizeQuality, QUALITY_OPTIONS, qualityLabel, type QualityBucket } from "@/lib/quality-normalize";

interface PlayerSubtitle {
  id: string;
  url: string;
  content?: string;
  blobUrl?: string;
  lang: string;
  normLang: "en" | "id";
  source?: string;
}

function normalizeSubtitleLanguage(raw: string | undefined): "en" | "id" | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/_/g, "-");
  if (v === "en" || v === "eng" || v === "english" || v === "en-us" || v === "en-gb" || v.startsWith("en-")) return "en";
  if (v === "id" || v === "ind" || v === "in" || v === "indonesia" || v === "indonesian" || v.startsWith("id-") || v.startsWith("ind")) return "id";
  return null;
}

interface SubtitleStyle {
  fontSize: number;
  fontFamily: "Arial" | "Inter" | "Roboto" | "sans-serif";
  textColor: "white" | "yellow" | "green" | "cyan";
  backgroundColor: "transparent" | "black" | "darkgray";
  backgroundOpacity: number;
  verticalPosition: "top" | "center" | "bottom";
  outline: "none" | "thin" | "thick";
  shadow: boolean;
}

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 100,
  fontFamily: "Arial",
  textColor: "white",
  backgroundColor: "black",
  backgroundOpacity: 75,
  verticalPosition: "bottom",
  outline: "thin",
  shadow: true,
};

const SUBTITLE_STYLE_STORAGE_KEY = "cinewave:subtitleStyle";

function subtitleKey(id: string | undefined, lang: string, url: string, source?: string): string {
  if (id) return id;
  return `${source || "sub"}-${lang}-${url || "content"}`;
}

interface SeriesEpisodeNav {
  id: string;
  title: string;
  season?: number;
  episode?: number;
}

type StreamStatus = "ONLINE" | "OFFLINE" | "CHECKING" | "UNKNOWN" | "INVALID";

interface StreamSource {
  id: string;
  sourceUrl?: string | null;
  format?: string;
  quality?: string;
  providerName?: string;
  name?: string;
  title?: string;
  description?: string;
  externalUrl?: string | null;
  behaviorHints?: Record<string, unknown>;
  status?: StreamStatus;
}

function validateStreamUrl(raw: string): { ok: boolean; error?: string } {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { ok: false, error: "URL stream tidak valid" };
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

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function PlayerContent() {
  const params = useSearchParams();
  const router = useRouter();
  const src = params.get("src");
  const title = params.get("title") || "CineWave Player";
  const titleId = params.get("titleId") || undefined;
  const type = params.get("type") || "movie";
  const addonId = params.get("addonId") || "";
  const seriesId = params.get("seriesId") || "";
  const seriesTitle = params.get("seriesTitle") || "";
  const seasonParam = params.get("season") || "";
  const episodeParam = params.get("episode") || "";
  const episodeTitleParam = params.get("episodeTitle") || "";

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Record<string, unknown> | null>(null);
  const trackRefs = useRef<Map<string, HTMLTrackElement>>(new Map());
  const blobUrls = useRef<Map<string, string>>(new Map());

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [activePanel, setActivePanel] = useState<"subtitle" | "subtitleSettings" | "sources" | null>(null);
  const [qualityFilter, setQualityFilter] = useState<QualityBucket | "All">("All");

  const [subtitleTracks, setSubtitleTracks] = useState<PlayerSubtitle[]>([]);
  const [selectedSub, setSelectedSub] = useState<string>("off");
  const [subtitleError, setSubtitleError] = useState("");
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(false);
  const [activeCues, setActiveCues] = useState<string[]>([]);
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(() => {
    if (typeof window === "undefined") return DEFAULT_SUBTITLE_STYLE;
    try {
      const raw = window.localStorage.getItem(SUBTITLE_STYLE_STORAGE_KEY);
      if (!raw) return DEFAULT_SUBTITLE_STYLE;
      const parsed = JSON.parse(raw) as Partial<SubtitleStyle>;
      return { ...DEFAULT_SUBTITLE_STYLE, ...parsed };
    } catch {
      return DEFAULT_SUBTITLE_STYLE;
    }
  });

  const [sources, setSources] = useState<StreamSource[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [sourcesError, setSourcesError] = useState("");

  const [seriesEpisodes, setSeriesEpisodes] = useState<SeriesEpisodeNav[]>([]);
  const [navLoading, setNavLoading] = useState(false);
  const [navError, setNavError] = useState("");

  // Series episodes metadata
  useEffect(() => {
    if (type !== "series" || !seriesId) return;
    let cancelled = false;
    const qs = `type=series${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;
    apiFetch<{ videos?: SeriesEpisodeNav[] }>(`catalog/title/${seriesId}?${qs}`)
      .then((m) => {
        if (cancelled) return;
        const episodes = (m.videos || [])
          .filter((v) => typeof v.season === "number" && typeof v.episode === "number")
          .sort((a, b) => (a.season! - b.season!) || (a.episode! - b.episode!));
        setSeriesEpisodes(episodes);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [seriesId, type, addonId]);

  const currentIndex = titleId ? seriesEpisodes.findIndex((e) => e.id === titleId) : -1;
  const currentEpisode = currentIndex >= 0 ? seriesEpisodes[currentIndex] : null;
  const prevEpisode = currentIndex > 0 ? seriesEpisodes[currentIndex - 1] : null;
  const nextEpisode = currentIndex >= 0 && currentIndex < seriesEpisodes.length - 1 ? seriesEpisodes[currentIndex + 1] : null;

  async function goToEpisode(target: SeriesEpisodeNav) {
    if (!seriesId) return;
    setNavLoading(true);
    setNavError("");
    try {
      const qs = `type=series${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;
      const res = await apiFetch<{ sources?: Array<{ id: string; sourceUrl?: string | null; externalUrl?: string | null }> }>(
        `playback/${target.id}?${qs}`
      );
      const stream = (res.sources || []).find((s) => s.sourceUrl);
      if (!stream?.sourceUrl) {
        setNavError("No Streams Available for This Episode");
        return;
      }
      const showTitle = seriesTitle || title.split(" - ")[0] || title;
      const playTitle = `${showTitle} - ${target.title}`;
      const episodeParams = `&seriesId=${encodeURIComponent(seriesId)}&seriesTitle=${encodeURIComponent(showTitle)}&season=${encodeURIComponent(String(target.season || 1))}&episode=${encodeURIComponent(String(target.episode || 1))}&episodeTitle=${encodeURIComponent(target.title || "")}`;
      router.push(`/player?src=${encodeURIComponent(stream.sourceUrl)}&title=${encodeURIComponent(playTitle)}&titleId=${encodeURIComponent(target.id)}&type=series${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}${episodeParams}`);
    } catch {
      setNavError("No Streams Available for This Episode");
    } finally {
      setNavLoading(false);
    }
  }

  async function checkStreamStatuses(list: StreamSource[]) {
    const validItems = list.filter((s) => !!s.sourceUrl);
    if (validItems.length === 0) return;
    setSources((prev) => prev.map((s) => (s.sourceUrl ? { ...s, status: "CHECKING" } : s)));

    const chunkSize = 10;
    for (let i = 0; i < validItems.length; i += chunkSize) {
      const chunk = validItems.slice(i, i + chunkSize);
      const urls = chunk.map((s) => s.sourceUrl as string);
      try {
        const res = await apiFetch<{ statuses?: Array<{ url: string; status: StreamStatus; httpStatus?: number; error?: string }> }>(
          "playback/stream-status",
          { method: "POST", body: JSON.stringify({ urls }) }
        );
        const statusMap = new Map((res.statuses || []).map((st) => [st.url, st]));
        setSources((prev) =>
          prev.map((s) => {
            if (!s.sourceUrl) return s;
            const st = statusMap.get(s.sourceUrl);
            if (!st) return s;
            return { ...s, status: st.status };
          })
        );
      } catch {
        setSources((prev) =>
          prev.map((s) => {
            if (!s.sourceUrl) return s;
            if (urls.includes(s.sourceUrl) && s.status === "CHECKING") {
              return { ...s, status: "UNKNOWN" };
            }
            return s;
          })
        );
      }
    }
  }

  // Fetch available sources for this title
  useEffect(() => {
    if (!titleId) return;
    let cancelled = false;
    queueMicrotask(() => { if (!cancelled) { setSourcesLoading(true); setSourcesError(""); } });
    const qs = `type=${encodeURIComponent(type)}${addonId ? `&addonId=${encodeURIComponent(addonId)}` : ""}`;
    apiFetch<{ sources?: StreamSource[] }>(`playback/${titleId}?${qs}`)
      .then((s) => {
        if (cancelled) return;
        const list = (s.sources || []).map((src) => ({ ...src, status: "CHECKING" as StreamStatus }));
        setSources(list);
        // Run status checks asynchronously
        void checkStreamStatuses(list);
      })
      .catch((e: unknown) => { if (!cancelled) setSourcesError(e instanceof Error ? e.message : "Failed to load sources"); })
      .finally(() => { if (!cancelled) setSourcesLoading(false); });
    return () => { cancelled = true; };
  }, [titleId, type, addonId]);

  // Playback init
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let cancelled = false;

    // cleanup previous hls
    if (hlsRef.current) {
      try { (hlsRef.current as { destroy: () => void }).destroy(); } catch {}
      hlsRef.current = null;
    }

    async function init(v: HTMLVideoElement) {
      if (!src) {
        if (!cancelled) { setError("URL stream kosong"); setLoading(false); }
        return;
      }
      const validation = validateStreamUrl(src);
      if (!validation.ok) {
        if (!cancelled) { setError(validation.error || "URL stream tidak valid"); setLoading(false); }
        return;
      }

      // subtitle metadata
      if (titleId) {
        setIsLoadingSubtitles(true);
        try {
          const data = await apiFetch<{ subtitles?: Array<{ id?: string; url?: string; content?: string; language?: string; source?: string; addonId?: string }> }>(
            `playback/${titleId}/subtitles?type=${encodeURIComponent(type)}`
          );
          const subs: PlayerSubtitle[] = [];
          const seenSubtitleIds = new Set<string>();
          for (const s of data.subtitles || []) {
            const normLang = normalizeSubtitleLanguage(s.language);
            if (!normLang) continue;
            const hasUrl = s.url && validateSubtitleUrl(s.url);
            const hasContent = s.content && s.content.trim().length > 0;
            if (!hasUrl && !hasContent) continue;
            const subId = subtitleKey(s.id, s.language || "", s.url || "", s.source);
            if (seenSubtitleIds.has(subId)) continue;
            seenSubtitleIds.add(subId);
            // If content is provided, create blob URL immediately
            let blobUrl: string | undefined;
            if (hasContent && s.content) {
              blobUrl = URL.createObjectURL(new Blob([s.content], { type: "text/vtt" }));
              blobUrls.current.set(subId, blobUrl);
            }
            subs.push({ id: subId, url: s.url || "", content: s.content, blobUrl, lang: s.language || normLang, normLang, source: s.source });
          }
          if (!cancelled) {
            setSubtitleTracks(subs);
            setSelectedSub("off");
            setSubtitleError("");
          }
        } catch {
          // subtitle metadata optional
        } finally {
          if (!cancelled) setIsLoadingSubtitles(false);
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
        if (Hls && typeof (Hls as { isSupported?: () => boolean }).isSupported === "function" && (Hls as { isSupported?: () => boolean }).isSupported?.()) {
          const HlsCtor = Hls as unknown as new (config?: unknown) => {
            loadSource: (s: string) => void;
            attachMedia: (v: HTMLVideoElement) => void;
            destroy: () => void;
            on: (t: string, cb: (evt: unknown, data: { fatal?: boolean; type?: string }) => void) => void;
          };
          const h = new HlsCtor();
          hlsRef.current = h;
          h.on("error", (_event, data) => {
            if (data?.fatal && !cancelled) setError(`HLS error: ${data.type || "unknown"}`);
          });
          h.on("manifestParsed", () => {
            if (!cancelled) { v.play().catch(() => {}); setLoading(false); }
          });
          v.crossOrigin = "anonymous";
          h.loadSource(src);
          h.attachMedia(v);
          v.addEventListener("canplay", () => { if (!cancelled) setLoading(false); }, { once: true });
        } else {
          if (!cancelled) setError("Browser tidak mendukung HLS");
        }
      } catch {
        if (!cancelled) setError("Gagal memuat library HLS");
      }
    }

    const tracks = trackRefs.current;
    const blobs = blobUrls.current;
    void init(video);
    return () => {
      cancelled = true;
      clearPendingPlayback();
      tracks.clear();
      for (const url of blobs.values()) URL.revokeObjectURL(url);
      blobs.clear();
      if (hlsRef.current) {
        try { (hlsRef.current as { destroy: () => void }).destroy(); } catch {}
        hlsRef.current = null;
      }
      if (video) { video.removeAttribute("src"); video.load(); }
    };
  }, [src, titleId, type]);

  // Lazy-load subtitle content
  useEffect(() => {
    if (selectedSub === "off" || !titleId) return;
    const track = subtitleTracks.find((t) => t.id === selectedSub);
    if (!track || track.blobUrl) return;
    // If content is already available, create blob URL directly
    if (track.content && track.content.trim().length > 0) {
      const oldBlob = blobUrls.current.get(track.id);
      if (oldBlob) URL.revokeObjectURL(oldBlob);
      const blobUrl = URL.createObjectURL(new Blob([track.content], { type: "text/vtt" }));
      blobUrls.current.set(track.id, blobUrl);
      queueMicrotask(() => {
        setSubtitleTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, blobUrl } : t)));
      });
      return;
    }
    if (!track.url) {
      queueMicrotask(() => setSubtitleError(`Subtitle ${track.lang} tidak memiliki URL.`));
      return;
    }
    let cancelled = false;
    apiFetch<{ content: string; format: string }>(
      `playback/${titleId}/subtitle-content?url=${encodeURIComponent(track.url)}`
    )
      .then((res) => {
        if (cancelled) return;
        const oldBlob = blobUrls.current.get(track.id);
        if (oldBlob) URL.revokeObjectURL(oldBlob);
        const blobUrl = URL.createObjectURL(new Blob([res.content], { type: "text/vtt" }));
        blobUrls.current.set(track.id, blobUrl);
        setSubtitleTracks((prev) => prev.map((t) => (t.id === track.id ? { ...t, blobUrl } : t)));
      })
      .catch(() => {
        if (!cancelled) setSubtitleError(`Subtitle ${track.lang} gagal dimuat.`);
      });
    return () => { cancelled = true; };
  }, [selectedSub, subtitleTracks, titleId, type]);

  // Persist subtitle style
  useEffect(() => {
    try {
      window.localStorage.setItem(SUBTITLE_STYLE_STORAGE_KEY, JSON.stringify(subtitleStyle));
    } catch {}
  }, [subtitleStyle]);

  // Set TextTrack mode - hidden for selected (custom overlay), disabled for others
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const tracks = video.querySelectorAll('track');
    let foundTrack: TextTrack | null = null;
    tracks.forEach((trackEl) => {
      const subId = trackEl.getAttribute('data-subtitle-id');
      const textTrack = trackEl.track;
      if (!textTrack) return;
      if (selectedSub !== "off" && subId === selectedSub) {
        textTrack.mode = "hidden";
        foundTrack = textTrack;
      } else {
        textTrack.mode = "disabled";
      }
    });
    if (!foundTrack) {
      queueMicrotask(() => setActiveCues([]));
      return;
    }
    const selectedTextTrack: TextTrack = foundTrack;
    const update = () => {
      const cues = selectedTextTrack.activeCues;
      const texts: string[] = [];
      if (cues) {
        for (let i = 0; i < cues.length; i++) {
          texts.push((cues[i] as unknown as { text: string }).text);
        }
      }
      setActiveCues(texts);
    };
    selectedTextTrack.addEventListener("cuechange", update);
    update();
    return () => {
      selectedTextTrack.removeEventListener("cuechange", update);
    };
  }, [selectedSub, subtitleTracks]);

  // Video event listeners
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onPlay = () => { setIsPlaying(true); setLoading(false); };
    const onPause = () => setIsPlaying(false);
    const onTime = () => setCurrentTime(v.currentTime);
    const onDur = () => setDuration(v.duration || 0);
    const onVol = () => { setVolume(v.volume); setMuted(v.muted); };
    const onWaiting = () => setLoading(true);
    const onCanPlay = () => setLoading(false);
    const onError = () => {
      const err = v.error;
      let msg = "The selected source could not be loaded.";
      if (err) {
        switch (err.code) {
          case MediaError.MEDIA_ERR_ABORTED: msg = "Playback aborted."; break;
          case MediaError.MEDIA_ERR_NETWORK: msg = "Network error while loading stream."; break;
          case MediaError.MEDIA_ERR_DECODE: msg = "Media decoding error."; break;
          case MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED: msg = "Source unavailable or unsupported media."; break;
        }
      }
      setError(msg);
      setLoading(false);
      // Mark current source as OFFLINE on playback failure
      setSources((prev) =>
        prev.map((s) => (s.sourceUrl === src ? { ...s, status: "OFFLINE" } : s))
      );
    };
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onDur);
    v.addEventListener("volumechange", onVol);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("error", onError);
    return () => {
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onDur);
      v.removeEventListener("volumechange", onVol);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("error", onError);
    };
  }, [src]);

  // Auto-hide controls
  useEffect(() => {
    if (!isPlaying) {
      queueMicrotask(() => setShowControls(true));
      return;
    }
    const timer = window.setTimeout(() => setShowControls(false), 3000);
    return () => window.clearTimeout(timer);
  }, [isPlaying, showControls]);

  // Click outside to close active panel
  useEffect(() => {
    if (!activePanel) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      // If clicking outside the floating panel, close active panel
      if (!target.closest(".player-floating-panel") && !target.closest('.player-ctrl-btn')) {
        setActivePanel(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [activePanel]);

  function bumpControls() {
    setShowControls(true);
  }

  function togglePlay() {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) v.play().catch(() => {});
    else v.pause();
  }

  function handleSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
  }

  function handleVolume(e: React.ChangeEvent<HTMLInputElement>) {
    const v = videoRef.current;
    if (!v) return;
    const val = Number(e.target.value);
    v.volume = val;
    v.muted = val === 0;
    setVolume(val);
    setMuted(val === 0);
  }

  function toggleMute() {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  }

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  useEffect(() => {
    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  function retry() {
    const v = videoRef.current;
    if (!v || !src) return;
    setError("");
    setLoading(true);
    v.load();
    v.play().catch(() => {});
  }

  function switchSource(stream: StreamSource) {
    if (!stream.sourceUrl) {
      if (stream.externalUrl) window.open(stream.externalUrl, "_blank");
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.set("src", stream.sourceUrl);
    router.replace(url.pathname + url.search);
    setActivePanel(null);
  }

  const selectedTrack = subtitleTracks.find((t) => t.id === selectedSub);

  if (!src) {
    return (
      <div className="player-empty">
        <p>No source provided.</p>
        <button className="btn btn-ghost" onClick={() => router.back()}>Back</button>
      </div>
    );
  }
  const validation = validateStreamUrl(src);
  if (!validation.ok) {
    return (
      <div className="player-empty">
        <p style={{ color: "var(--danger)" }}>{validation.error}</p>
        <button className="btn btn-ghost" onClick={() => router.back()}>Back</button>
      </div>
    );
  }

  const seriesLabel = currentEpisode
    ? `S${currentEpisode.season} E${currentEpisode.episode} · ${currentEpisode.title}`
    : (seasonParam || episodeParam || episodeTitleParam)
      ? `S${seasonParam || 1} E${episodeParam || 1}${episodeTitleParam ? ` · ${episodeTitleParam}` : ""}`
      : "";

  return (
    <div className="player-root">
      <div className="player-topbar">
        <button className="player-icon-btn" onClick={() => router.back()} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>
        </button>
        <div className="player-title-block">
          <span className="player-title">{title}</span>
          {type === "series" && seriesLabel && <span className="player-subtitle">{seriesLabel}</span>}
        </div>
        <span className="player-logo">CineWave</span>
      </div>

      {type === "series" && (
        <div className="player-series-bar">
          <div>
            <div className="player-series-name">{seriesTitle || title.split(" - ")[0] || title}</div>
            <div className="player-series-episode">{seriesLabel}</div>
          </div>
          <div className="player-series-nav">
            <button className="btn btn-secondary btn-sm" disabled={!prevEpisode || navLoading} onClick={() => prevEpisode && goToEpisode(prevEpisode)}>Previous</button>
            <button className="btn btn-secondary btn-sm" disabled={!nextEpisode || navLoading} onClick={() => nextEpisode && goToEpisode(nextEpisode)}>Next</button>
          </div>
          {navError && <span className="player-nav-error">{navError}</span>}
        </div>
      )}

      <div
        ref={containerRef}
        className="player-stage"
        onMouseMove={bumpControls}
        onMouseLeave={() => isPlaying && setShowControls(false)}
      >
        {loading && !error && (
          <div className="player-loading">
            <div className="spinner" />
            <span>Loading stream...</span>
          </div>
        )}

        {error && (
          <div className="player-error">
            <h2>Unable to Play This Stream</h2>
            <p>The selected source could not be loaded.</p>
            <p className="player-error-detail">{error}</p>
            <div className="player-error-actions">
              <button className="btn btn-primary btn-sm" onClick={retry}>Try Again</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setActivePanel("sources")}>Choose Another Source</button>
              <button className="btn btn-ghost btn-sm" onClick={() => router.back()}>Back to Details</button>
            </div>
          </div>
        )}

        <video
          ref={videoRef}
          className="player-video"
          autoPlay
          playsInline
          muted={muted}
          onClick={togglePlay}
          onCanPlay={() => setLoading(false)}
        >
          {subtitleTracks.map((t) => {
            return (
              <track
                key={t.id}
                data-subtitle-id={t.id}
                ref={(el) => { if (el) trackRefs.current.set(t.id, el); }}
                src={t.blobUrl || t.url}
                srcLang={t.lang}
                label={t.lang}
                kind="subtitles"
                onError={() => { if (t.id === selectedSub) setSubtitleError(`Subtitle ${t.lang} gagal dimuat.`); }}
              />
            );
          })}
        </video>

        <div className={`player-controls ${showControls || !isPlaying || !!error ? "visible" : ""}`}>
          <div className="player-progress-row">
            <input
              type="range"
              className="player-seek"
              min={0}
              max={duration || 0}
              step={0.1}
              value={Math.min(currentTime, duration || 0)}
              onChange={handleSeek}
              aria-label="Seek"
            />
          </div>
          <div className="player-control-row">
            <div className="player-control-left">
              <button className="player-ctrl-btn" onClick={togglePlay} aria-label={isPlaying ? "Pause" : "Play"}>
                {isPlaying ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                )}
              </button>
              <span className="player-time">{formatTime(currentTime)} / {formatTime(duration)}</span>
            </div>

            <div className="player-control-right">
              <div className="player-volume">
                <button className="player-ctrl-btn" onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
                  {muted || volume === 0 ? (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>
                  ) : (
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 5L6 9H2v6h4l5 4V5z"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
                  )}
                </button>
                <input type="range" className="player-volume-slider" min={0} max={1} step={0.01} value={muted ? 0 : volume} onChange={handleVolume} aria-label="Volume" />
              </div>

              <button className="player-ctrl-btn" onClick={() => setActivePanel((p) => (p === "subtitle" ? null : "subtitle"))} aria-label="Subtitles">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M7 15h4M13 15h4M7 11h10"/></svg>
              </button>

              <button className="player-ctrl-btn" onClick={() => setActivePanel((p) => (p === "subtitleSettings" ? null : "subtitleSettings"))} aria-label="Subtitle Settings">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
              </button>

              <button className="player-ctrl-btn" onClick={() => setActivePanel((p) => (p === "sources" ? null : "sources"))} aria-label="Sources">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
              </button>

              <button className="player-ctrl-btn" onClick={toggleFullscreen} aria-label="Fullscreen">
                {isFullscreen ? (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3"/></svg>
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>
                )}
              </button>
            </div>
          </div>
        </div>

        {activePanel === "sources" && (
          <div className="player-floating-panel player-sources-panel">
            <div className="player-panel-header">
              <span>Stream Sources</span>
              <button className="player-panel-close" onClick={() => setActivePanel(null)} aria-label="Close">×</button>
            </div>
            {sourcesLoading && <div className="player-panel-loading">Loading sources...</div>}
            {sourcesError && <div className="player-panel-error">{sourcesError}</div>}
            <div className="player-panel-actions">
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => void checkStreamStatuses(sources)}
                disabled={sourcesLoading || sources.every((s) => s.status === "CHECKING")}
              >
                Refresh Status
              </button>
            </div>
            <div className="quality-filter" role="group" aria-label="Filter by video quality">
              {(["All", ...QUALITY_OPTIONS] as Array<QualityBucket | "All">).map((q) => (
                <button
                  key={q}
                  type="button"
                  className={`quality-chip ${qualityFilter === q ? "active" : ""}`}
                  onClick={() => setQualityFilter(q)}
                  aria-pressed={qualityFilter === q}
                >
                  {q === "All" ? "All" : qualityLabel(q)}
                </button>
              ))}
            </div>
            {!sourcesLoading && sources.filter(s => qualityFilter === "All" || normalizeQuality(s) === qualityFilter).length === 0 && (
              <div className="player-panel-empty">
                <p>No streams available for the selected quality.</p>
                <button className="btn btn-secondary btn-sm" onClick={() => setQualityFilter("All")}>Reset Filter</button>
              </div>
            )}
            {[...sources]
              .filter(s => qualityFilter === "All" || normalizeQuality(s) === qualityFilter)
              .sort((a, b) => {
              const order: Record<StreamStatus, number> = { ONLINE: 0, UNKNOWN: 1, CHECKING: 2, OFFLINE: 3, INVALID: 4 };
              return (order[a.status ?? "UNKNOWN"] ?? 2) - (order[b.status ?? "UNKNOWN"] ?? 2);
            }).map((s) => {
              const active = !!s.sourceUrl && s.sourceUrl === src;
              const status = s.status ?? "UNKNOWN";
              return (
                <div key={s.id} className={`player-source-card ${active ? "active" : ""}`}>
                  <div className="player-source-main">
                    <div className="player-source-addon">{s.providerName || "Unknown Addon"}</div>
                    <div className="player-source-name">{s.name || s.title || "Unnamed stream"}</div>
                    <div className="player-source-meta">
                      {[s.quality, s.format, (s.behaviorHints?.videoCodec as string) || null, (s.behaviorHints?.audioCodec as string) || null]
                        .filter(Boolean)
                        .join(" · ")}
                    </div>
                    <div className="player-source-status">
                      <span className={`player-status-badge status-${status.toLowerCase()}`}>{status}</span>
                    </div>
                  </div>
                  <button
                    className={`btn btn-sm ${active ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => switchSource(s)}
                    disabled={active || status === "OFFLINE" || status === "INVALID"}
                  >
                    {active ? "Selected" : "Play"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {activePanel === "subtitle" && (
          <div className="player-floating-panel player-subtitle-panel">
            <div className="player-panel-header">
              <span>Subtitles</span>
              <button className="player-panel-close" onClick={() => setActivePanel(null)} aria-label="Close">×</button>
            </div>
            <div className="player-setting-group">
              <div className="player-setting-label">Subtitles</div>
              {isLoadingSubtitles ? (
                <span className="player-setting-hint">Loading subtitles…</span>
              ) : subtitleTracks.length === 0 ? (
                <span className="player-setting-hint">No English or Indonesian subtitles available.</span>
              ) : (
                <div className="player-setting-options">
                  <button className={`player-option ${selectedSub === "off" ? "active" : ""}`} onClick={() => setSelectedSub("off")}>Off</button>
                  {subtitleTracks.map((t) => (
                    <button key={t.id} className={`player-option ${selectedSub === t.id ? "active" : ""}`} onClick={() => setSelectedSub(t.id)}>
                      {t.normLang === "en" ? "English" : "Indonesia"}{t.source ? ` — ${t.source}` : ""}
                    </button>
                  ))}
                </div>
              )}
              {subtitleError && <span className="player-setting-error">{subtitleError}</span>}
            </div>
            {selectedTrack?.source && (
              <div className="player-setting-hint">Source: {selectedTrack.source}</div>
            )}
            {selectedSub !== "off" && selectedTrack && (
              <div className="player-setting-hint" style={{ color: "var(--success)" }}>Active</div>
            )}
          </div>
        )}

        {activePanel === "subtitleSettings" && (
          <div className="player-floating-panel player-settings-panel">
            <div className="player-panel-header">
              <span>Subtitle Settings</span>
              <button className="player-panel-close" onClick={() => setActivePanel(null)} aria-label="Close">×</button>
            </div>
            <div className="player-setting-group">
              <div className="player-setting-label">Subtitle Appearance</div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Size</span>
                <input
                  type="range"
                  min={50}
                  max={200}
                  step={10}
                  value={subtitleStyle.fontSize}
                  onChange={(e) => setSubtitleStyle((s) => ({ ...s, fontSize: Number(e.target.value) }))}
                  className="player-setting-slider"
                />
                <span className="player-setting-value">{subtitleStyle.fontSize}%</span>
              </div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Font</span>
                <select
                  className="player-setting-select"
                  value={subtitleStyle.fontFamily}
                  onChange={(e) => setSubtitleStyle((s) => ({ ...s, fontFamily: e.target.value as SubtitleStyle["fontFamily"] }))}
                >
                  <option value="Arial">Arial</option>
                  <option value="Inter">Inter</option>
                  <option value="Roboto">Roboto</option>
                  <option value="sans-serif">Sans-serif</option>
                </select>
              </div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Color</span>
                <div className="player-setting-options">
                  {(["white", "yellow", "green", "cyan"] as const).map((c) => (
                    <button
                      key={c}
                      className={`player-option ${subtitleStyle.textColor === c ? "active" : ""}`}
                      onClick={() => setSubtitleStyle((s) => ({ ...s, textColor: c }))}
                    >
                      {c.charAt(0).toUpperCase() + c.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Background</span>
                <div className="player-setting-options">
                  {(["transparent", "black", "darkgray"] as const).map((b) => (
                    <button
                      key={b}
                      className={`player-option ${subtitleStyle.backgroundColor === b ? "active" : ""}`}
                      onClick={() => setSubtitleStyle((s) => ({ ...s, backgroundColor: b }))}
                    >
                      {b === "darkgray" ? "Dark Gray" : b.charAt(0).toUpperCase() + b.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Bg Opacity</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={subtitleStyle.backgroundOpacity}
                  onChange={(e) => setSubtitleStyle((s) => ({ ...s, backgroundOpacity: Number(e.target.value) }))}
                  className="player-setting-slider"
                />
                <span className="player-setting-value">{subtitleStyle.backgroundOpacity}%</span>
              </div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Position</span>
                <div className="player-setting-options">
                  {(["top", "center", "bottom"] as const).map((p) => (
                    <button
                      key={p}
                      className={`player-option ${subtitleStyle.verticalPosition === p ? "active" : ""}`}
                      onClick={() => setSubtitleStyle((s) => ({ ...s, verticalPosition: p }))}
                    >
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Outline</span>
                <div className="player-setting-options">
                  {(["none", "thin", "thick"] as const).map((o) => (
                    <button
                      key={o}
                      className={`player-option ${subtitleStyle.outline === o ? "active" : ""}`}
                      onClick={() => setSubtitleStyle((s) => ({ ...s, outline: o }))}
                    >
                      {o.charAt(0).toUpperCase() + o.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="player-setting-row">
                <span className="player-setting-sublabel">Shadow</span>
                <div className="player-setting-options">
                  <button
                    className={`player-option ${subtitleStyle.shadow ? "active" : ""}`}
                    onClick={() => setSubtitleStyle((s) => ({ ...s, shadow: true }))}
                  >
                    On
                  </button>
                  <button
                    className={`player-option ${!subtitleStyle.shadow ? "active" : ""}`}
                    onClick={() => setSubtitleStyle((s) => ({ ...s, shadow: false }))}
                  >
                    Off
                  </button>
                </div>
              </div>

              <div className="player-setting-row">
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => setSubtitleStyle(DEFAULT_SUBTITLE_STYLE)}
                >
                  Reset to Default
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedSub !== "off" && activeCues.length > 0 && (
          <div className={`player-subtitle-overlay pos-${subtitleStyle.verticalPosition}`}>
            {activeCues.map((text, i) => (
              <span
                key={i}
                className="player-subtitle-cue"
                style={{
                  fontSize: `${subtitleStyle.fontSize}%`,
                  fontFamily: subtitleStyle.fontFamily,
                  color: subtitleStyle.textColor === "white" ? "#ffffff" : subtitleStyle.textColor === "yellow" ? "#ffeb3b" : subtitleStyle.textColor === "green" ? "#4caf50" : "#00bcd4",
                  backgroundColor:
                    subtitleStyle.backgroundColor === "transparent"
                      ? "transparent"
                      : subtitleStyle.backgroundColor === "black"
                      ? `rgba(0,0,0,${subtitleStyle.backgroundOpacity / 100})`
                      : `rgba(64,64,64,${subtitleStyle.backgroundOpacity / 100})`,
                  textShadow: [
                    subtitleStyle.outline === "thin"
                      ? "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000"
                      : subtitleStyle.outline === "thick"
                      ? "-2px -2px 0 #000, 2px -2px 0 #000, -2px 2px 0 #000, 2px 2px 0 #000, -3px 0 0 #000, 3px 0 0 #000, 0 -3px 0 #000, 0 3px 0 #000"
                      : "",
                    subtitleStyle.shadow ? "2px 2px 4px rgba(0,0,0,0.9)" : "",
                  ].filter(Boolean).join(", "),
                }}
              >
                {text.replace(/<[^>]*>/g, "").split(/\n/).map((line, idx) => (
                  <span key={idx}>
                    {line}
                    {idx < text.split(/\n/).length - 1 && <br />}
                  </span>
                ))}
              </span>
            ))}
          </div>
        )}
        {isLoadingSubtitles && <span style={{ display: "none" }} />}
      </div>

      <div className="player-info">
        <h1 className="player-info-title">{title}</h1>
        {type === "series" && seriesLabel && <div className="player-info-episode">{seriesLabel}</div>}
        {type === "series" && episodeTitleParam && <div className="player-info-episode-title">{episodeTitleParam}</div>}
        {type === "movie" && (
          <p className="player-info-note">Enjoy your movie. Use the controls above to adjust playback, sources, and subtitles.</p>
        )}
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
