"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, apiPost } from "@/services/api";

interface User {
  id: string;
  name: string;
  email: string;
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    apiFetch<{ user: User }>("auth/me")
      .then((data) => setUser(data.user))
      .catch(() => router.push("/login"))
      .finally(() => setLoading(false));
  }, [router]);

  async function handleLogout() {
    try {
      await apiPost("auth/logout", {});
    } catch {}
    localStorage.removeItem("token");
    router.push("/");
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
        <Link href="/watchlist">Watchlist</Link>
        <Link href="/history">History</Link>
        <Link href="/addons">Add-ons</Link>
        <Link href="/profile" className="active">Profile</Link>
      </aside>
      <main className="main-content fade-in">
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 24 }}>Profile</h1>
        <div className="card" style={{ maxWidth: 480 }}>
          {user && (
            <>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div className="avatar" style={{ width: 64, height: 64, fontSize: 24 }}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 700 }}>{user.name}</h2>
                  <p style={{ color: "var(--text-muted)", fontSize: 14 }}>{user.email}</p>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={handleLogout} style={{ width: "100%", justifyContent: "center" }}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
