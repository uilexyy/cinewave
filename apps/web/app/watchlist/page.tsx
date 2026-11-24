"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, apiDelete } from "@/services/api";

interface WatchlistItem {
  id: string;
  title: string;
  type: string;
  posterUrl: string | null;
  releaseDate: string | null;
  rating: number | null;
}

export default function WatchlistPage() {
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const data = await apiFetch<WatchlistItem[]>("watchlist");
      setItems(data);
    } catch {
      window.location.href = "/login";
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function remove(id: string) {
    try {
      await apiDelete(`watchlist?titleId=${id}`);
      await load();
    } catch {}
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="sidebar">
        <span className="logo" style={{ fontSize: 24 }}>CineWave</span>
        <Link href="/home">Home</Link>
        <Link href="/search">Search</Link>
        <Link href="/watchlist" className="active">Watchlist</Link>
        <Link href="/history">History</Link>
        <Link href="/addons">Add-ons</Link>
        <Link href="/profile">Profile</Link>
      </aside>
      <main className="main-content fade-in">
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>My Watchlist</h1>
        {items.length === 0 ? (
          <div className="empty-state">
            <h3>Your Watchlist is Empty</h3>
            <p>Add titles to your watchlist to watch them later.</p>
            <Link className="btn btn-primary" href="/home">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div className="grid grid-4">
            {items.map((item) => (
              <div key={item.id} className="poster-card">
                {item.posterUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.posterUrl} alt={item.title} />
                ) : (
                  <div style={{ aspectRatio: "2/3", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    No Poster
                  </div>
                )}
                <div className="title">{item.title}</div>
                <div style={{ padding: "0 12px 12px" }}>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "4px 10px", fontSize: 11, width: "100%" }}
                    onClick={() => remove(item.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
