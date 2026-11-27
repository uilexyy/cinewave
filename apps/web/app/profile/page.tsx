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
    try { await apiPost("auth/logout", {}); } catch {}
    localStorage.removeItem("token");
    router.push("/");
  }

  return (
    <main className="main-content fade-in">
      <div className="page-narrow">
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>Profile</h1>
        <p className="muted" style={{ marginBottom: 32, fontSize: 14 }}>Your account and preferences.</p>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : user ? (
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 32 }}>
              <div className="avatar" style={{ width: 80, height: 80, fontSize: 32 }}>{user.name.charAt(0).toUpperCase()}</div>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700 }}>{user.name}</h2>
                <p className="muted small">{user.email}</p>
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Link href="/watchlist" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}>My Watchlist</Link>
              <Link href="/history" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}>Watch History</Link>
              <Link href="/addons" className="btn btn-secondary" style={{ justifyContent: "flex-start" }}>Manage Add-ons</Link>
            </div>
            <button className="btn btn-danger" style={{ width: "100%", marginTop: 32 }} onClick={handleLogout}>Sign Out</button>
          </div>
        ) : null}
      </div>
    </main>
  );
}
