"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";
import Sidebar from "@/components/Sidebar";
import { dedupeCatalogItems, catalogIdentity } from "@/lib/catalog";

interface CatalogItem {
  id: string;
  type: string;
  name: string;
  poster?: string;
  description?: string;
  releaseInfo?: string;
  imdbRating?: string;
  genres?: string[];
  addonId?: string;
  addonName?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasAddons, setHasAddons] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch<{ user: User }>("auth/me")
      .then((me) => setUser(me.user))
      .catch(() => {
        router.push("/login");
      });
    apiFetch<Record<string, CatalogItem[]>>("catalog/home")
      .then((data) => {
        const all = [
          ...(data.trending || []),
          ...(data.popularMovies || []),
          ...(data.popularSeries || []),
          ...(data.topRatedMovies || []),
          ...(data.topRatedSeries || []),
        ];
        setItems(dedupeCatalogItems(all));
        if (all.length === 0) setHasAddons(false);
      })
      .catch(() => setHasAddons(false))
      .finally(() => setLoading(false));
  }, [router]);

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar active="home" />
      <main className="main-content fade-in" style={{ flex: 1 }}>
        {/* Topbar */}
        <div className="topbar">
          <h1 style={{ fontSize: 28, fontWeight: 800 }}>CineWave</h1>
          <div className="profile-menu">
            {user && (
              <>
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{user.name}</span>
                <div className="avatar">{user.name.charAt(0).toUpperCase()}</div>
              </>
            )}
          </div>
        </div>

        {/* Hero */}
        <div className="hero">
          <span className="badge" style={{ marginBottom: 16, borderColor: "rgba(139,92,246,0.4)", color: "#C4B5FD" }}>
            Welcome back
          </span>
          <h1 style={{ fontSize: 36 }}>Your Entertainment, Your Way.</h1>
          <p>
            {hasAddons
              ? "Browse your catalog from installed add-ons below."
              : "No add-ons installed yet. Install one to start streaming."}
          </p>
          {!hasAddons && (
            <div style={{ marginTop: 24 }}>
              <Link className="btn btn-primary" href="/addons">
                Install Add-ons
              </Link>
            </div>
          )}
        </div>

        {/* Catalog */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Catalog</h2>
            <span className="section-subtitle">{items.length} items from your add-ons</span>
          </div>
          {items.length === 0 ? (
            <div className="empty-state">
              <h3>No Content Available</h3>
              <p>Install an add-on to populate your catalog.</p>
              <Link className="btn btn-primary" href="/addons">
                Go to Add-ons
              </Link>
            </div>
          ) : (
            <div className="grid grid-5">
              {items.map((item) => (
                <Link
                  key={catalogIdentity(item)}
                  href={`/title/${encodeURIComponent(item.id)}?type=${encodeURIComponent(item.type)}&addonId=${encodeURIComponent(item.addonId || "")}`}
                  className="poster-card"
                  style={{ display: "block", textDecoration: "none", color: "inherit" }}
                  aria-label={`Open ${item.name}`}
                >
                  {item.poster ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.poster} alt={item.name} />
                  ) : (
                    <div style={{ aspectRatio: "2/3", background: "var(--surface-2)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)" }}>
                      No Poster
                    </div>
                  )}
                  <div className="title">{item.name}</div>
                  {item.addonName && (
                    <div style={{ padding: "0 12px 10px", fontSize: 11, color: "var(--text-dim)" }}>
                      {item.addonName}
                    </div>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
