"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";
import MovieCard, { MovieCardData } from "@/components/MovieCard";

function SearchContent() {
  const searchParams = useSearchParams();
  const q = searchParams.get("q") || "";
  const router = useRouter();

  const [query, setQuery] = useState(q);
  const [results, setResults] = useState<MovieCardData[]>([]);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!q) return;
    let cancelled = false;
    queueMicrotask(() => setLoading(true));
    apiFetch<{ results: MovieCardData[] }>(`catalog/search?q=${encodeURIComponent(q)}`)
      .then((data) => { if (!cancelled) setResults(data.results || []); })
      .catch(() => { if (!cancelled) setResults([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [q]);

  useEffect(() => {
    if (!query || query === q) return;
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      router.push(`/search?q=${encodeURIComponent(query)}`);
    }, 500);
    return () => { if (timeoutRef.current) clearTimeout(timeoutRef.current); };
  }, [query, q, router]);

  return (
    <main className="main-content fade-in">
      <div className="page page-narrow">
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>Discover</h1>
        <p className="muted" style={{ marginBottom: 28, fontSize: 14 }}>Search movies, series, and more from your add-ons.</p>

        <form onSubmit={(e) => { e.preventDefault(); if (query.trim()) router.push(`/search?q=${encodeURIComponent(query)}`); }}>
          <div className="search-bar" style={{ maxWidth: 640, width: "100%" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--text-dim)" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/></svg>
            <input
              placeholder="Search movies, series, anime..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              autoFocus
              aria-label="Search"
            />
          </div>
        </form>

        <div style={{ marginTop: 32 }}>
          {loading && (
            <div className="card-grid">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="skeleton skeleton-poster" />
              ))}
            </div>
          )}

          {!loading && q && results.length === 0 && (
            <div className="empty-state">
              <h3>No Results</h3>
              <p>No matches found for &quot;{q}&quot;.</p>
            </div>
          )}

          {!loading && results.length > 0 && (
            <>
              <p className="small dim" style={{ marginBottom: 16 }}>{results.length} result{results.length > 1 ? "s" : ""} for &quot;{q}&quot;</p>
              <div className="card-grid">
                {results.map((item) => (
                  <MovieCard key={`${item.type}:${item.id}`} item={item} />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <SearchContent />
    </Suspense>
  );
}
