"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { apiFetch, apiPatch, apiDelete } from "@/services/api";

interface HistoryItem {
  id: string;
  titleId: string;
  episodeId: string | null;
  title: string;
  positionSeconds: number;
  durationSeconds: number;
  completed: boolean;
}

export default function HistoryPage() {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<HistoryItem[]>("history");
      setItems(data);
    } catch { router.push("/login"); }
    finally { setLoading(false); }
  }, [router]);

  useEffect(() => { queueMicrotask(() => { void load(); }); }, [load]);

  async function markCompleted(progressId: string) {
    try { await apiPatch(`history?id=${progressId}`, { completed: true }); await load(); } catch {}
  }

  async function remove(id: string) {
    try { await apiDelete(`history?id=${id}`); await load(); } catch {}
  }

  return (
    <main className="main-content fade-in">
      <div className="page">
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>Watch History</h1>
        <p className="muted" style={{ marginBottom: 32, fontSize: 14 }}>Continue where you left off.</p>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : items.length === 0 ? (
          <div className="empty-state">
            <h3>No Watch History</h3>
            <p>Your recently watched titles will appear here.</p>
            <Link className="btn btn-primary" href="/home" style={{ marginTop: 12 }}>Browse Catalog</Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => {
              const pct = item.durationSeconds > 0 ? Math.min(100, Math.round((item.positionSeconds / item.durationSeconds) * 100)) : 0;
              return (
                <div key={item.id} className="card" style={{ display: "flex", alignItems: "center", gap: 20, flexWrap: "wrap" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 14, background: "linear-gradient(135deg, var(--accent), var(--accent-2))", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, flexShrink: 0, color: "#fff", boxShadow: "0 4px 16px var(--accent-glow)" }}>
                    {item.title.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{item.title}</h3>
                    <div className="progress"><div style={{ width: `${pct}%` }} /></div>
                    <p className="small dim" style={{ marginTop: 6 }}>{item.completed ? "Completed" : `${pct}% watched · ${item.positionSeconds}s`}</p>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                    {!item.completed && (
                      <button className="btn btn-secondary btn-sm" onClick={() => markCompleted(item.id)}>Mark Complete</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => remove(item.id)}>Remove</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
