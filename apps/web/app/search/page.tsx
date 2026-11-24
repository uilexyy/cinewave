"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { apiFetch } from "@/services/api";

interface CatalogItem {
  id: string;
  type: string;
  name: string;
  poster?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  addonName?: string;
}

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!q) {
      setResults([]);
      return;
    }
    setLoading(true);
    apiFetch<{ results: CatalogItem[] }>(`catalog/search?q=${encodeURIComponent(q)}`)
      .then((data) => setResults(data.results || []))
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [q]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) window.location.href = `/search?q=${encodeURIComponent(query)}`;
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <aside className="sidebar">
        <span className="logo" style={{ fontSize: 24 }}>CineWave</span>
        <Link href="/home">Home</Link>
        <Link href="/search" className="active">Search</Link>
        <Link href="/watchlist">Watchlist</Link>
        <Link href="/history">History</Link>
        <Link href="/addons">Add-ons</Link>
        <Link href="/profile">Profile</Link>
      </aside>
      <main className="main-content fade-in">
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Search</h1>
        <form onSubmit={submit} style={{ marginBottom: 24 }}>
          <div className="search-bar" style={{ maxWidth: "100%" }}>
            <input
              placeholder="Search movies, series, anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
            />
          </div>
        </form>
        {loading && (
          <div className="loading">
            <div className="spinner" />
          </div>
        )}
        {!loading && q && results.length === 0 && (
          <div className="empty-state">
            <h3>No Results</h3>
            <p>No matches found for "{q}".</p>
          </div>
        )}
        {!loading && results.length > 0 && (
          <div className="grid grid-5">
            {results.map((item) => (
              <div key={`${item.addonName}-${item.id}`} className="poster-card">
                {item.poster ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.poster} alt={item.name} />
                ) : (
                  <div style={{ aspectRatio: "2/3", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                    No Poster
                  </div>
                )}
                <div className="title">{item.name}</div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
