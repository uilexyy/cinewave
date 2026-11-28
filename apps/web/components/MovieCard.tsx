"use client";

import Link from "next/link";
import { useState } from "react";

export interface MovieCardData {
  id: string;
  type: string;
  name: string;
  poster?: string;
  background?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  addonId?: string;
  addonName?: string;
  description?: string;
  country?: string | string[];
  countries?: string[];
  countryCode?: string;
  originCountry?: string | string[];
  productionCountries?: Array<string | { name?: string; iso_3166_1?: string; code?: string }>;
}

interface Props {
  item: MovieCardData;
  className?: string;
  showMeta?: boolean;
  badge?: React.ReactNode;
}

function buildHref(item: MovieCardData) {
  return `/title/${encodeURIComponent(item.id)}?${new URLSearchParams({
    type: item.type,
    addonId: item.addonId || "",
    name: item.name || "",
    poster: item.poster || "",
    background: item.background || "",
    addonName: item.addonName || "",
    releaseInfo: item.releaseInfo || "",
    imdbRating: item.imdbRating || "",
    genres: (item.genres || []).join(","),
    description: item.description || "",
  }).toString()}`;
}

export default function MovieCard({ item, className = "", showMeta = false, badge }: Props) {
  const [failed, setFailed] = useState(false);
  return (
    <Link
      href={buildHref(item)}
      className={`poster-card ${className}`}
      aria-label={`Open ${item.name}`}
    >
      <div className="poster-media">
        {!failed && item.poster ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={item.poster} alt={item.name} loading="lazy" onError={() => setFailed(true)} />
        ) : (
          <div
            style={{
              aspectRatio: "2/3",
              background: "linear-gradient(160deg, var(--surface-2), var(--surface))",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="5" width="19" height="14" rx="2"/><path d="M6 9h12M6 12h6"/></svg>
            No Poster
          </div>
        )}
        {badge && <span className="poster-badge">{badge}</span>}
      </div>
      <div className="card-title">{item.name}</div>
      {showMeta && (item.releaseInfo || item.imdbRating || item.genres?.[0]) && (
        <span
          style={{
            position: "absolute",
            top: 8,
            right: 8,
            background: "rgba(5,5,8,0.75)",
            backdropFilter: "blur(6px)",
            border: "1px solid var(--border)",
            color: "var(--text-muted)",
            fontSize: 11,
            fontWeight: 700,
            padding: "3px 7px",
            borderRadius: 6,
            display: "inline-flex",
            gap: 4,
            alignItems: "center",
          }}
        >
          {item.imdbRating ? `IMDb ${item.imdbRating}` : item.releaseInfo}
        </span>
      )}
    </Link>
  );
}
