"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { apiFetch } from "@/services/api";
import MovieCard, { MovieCardData } from "@/components/MovieCard";
import { PLATFORMS } from "@/lib/catalog-categories";

interface DiscoverData {
  results: MovieCardData[];
  total: number;
}

export default function PlatformPage() {
  const params = useParams<{ key: string }>();
  const key = params.key || "";
  const platform = (PLATFORMS as Record<string, { name: string; logo: string; color: string }>)[key];

  const [data, setData] = useState<DiscoverData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    apiFetch<DiscoverData>(`catalog/discover?platform=${encodeURIComponent(key)}`)
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => { if (!cancelled) setData({ results: [], total: 0 }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [key]);

  const name = platform?.name || key;

  return (
    <main className="main-content fade-in">
      <div className="page">
        <div className="section-header" style={{ marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: "clamp(28px, 4vw, 40px)", fontWeight: 800, letterSpacing: "-0.5px" }}>
              {platform && <span className="platform-logo" style={{ background: platform.color, color: platform.color === "#FFFFFF" ? "#000" : "#fff", marginRight: 12 }}>{platform.logo}</span>}
              {name}
            </h1>
            <p className="section-subtitle">Titles from your add-ons, filtered by catalog source (inferred, not verified streaming availability).</p>
          </div>
        </div>
        {loading && <div className="card-grid">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton skeleton-poster" />)}</div>}
        {!loading && data && data.results.length === 0 && (
          <div className="empty-state"><h3>No Titles</h3><p>No content available for this platform yet.</p></div>
        )}
        {!loading && data && data.results.length > 0 && (
          <div className="card-grid">
            {data.results.map((item) => <MovieCard key={`${item.type}:${item.id}`} item={item} showMeta />)}
          </div>
        )}
      </div>
    </main>
  );
}
