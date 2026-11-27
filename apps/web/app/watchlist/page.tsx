"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, apiDelete } from "@/services/api";
import MovieCard, { MovieCardData } from "@/components/MovieCard";

interface WatchlistItem {
  id: string;
  title: string;
  type: string;
  posterUrl: string | null;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<WatchlistItem[]>("watchlist");
      setItems(data);
    } catch { router.push("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  async function remove(id: string) {
    try {
      await apiDelete(`watchlist?titleId=${id}`);
      await load();
    } catch {}
  }

  return (
    <main className="main-content fade-in">
      <div className="page">
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>My Watchlist</h1>
        <p className="muted" style={{ marginBottom: 32, fontSize: 14 }}>Saved movies and series to watch later.</p>

        {loading ? (
          <div className="card-grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton skeleton-poster" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>Your Watchlist is Empty</h3>
            <p>Bookmark titles from the catalog to watch them later.</p>
            <Link className="btn btn-primary" href="/home" style={{ marginTop: 12 }}>Browse Catalog</Link>
          </div>
        ) : (
          <div className="card-grid">
            {items.map((item) => {
              const cardData: MovieCardData = {
                id: item.id,
                type: item.type,
                name: item.title,
                poster: item.posterUrl || undefined,
              };
              return (
                <MovieCard
                  key={item.id}
                  item={cardData}
                  badge={
                    <button
                      className="icon-btn"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); void remove(item.id); }}
                      style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(239, 68, 68, 0.8)", color: "#fff", border: "none" }}
                      aria-label="Remove from watchlist"
                    >
                      ✕
                    </button>
                  }
                />
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
