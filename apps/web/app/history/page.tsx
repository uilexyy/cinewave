"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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

  async function load() {
    try {
      const data = await apiFetch<HistoryItem[]>("history");
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

  async function markCompleted(progressId: string) {
    try {
      await apiPatch(`history?id=${progressId}`, { completed: true });
      await load();
    } catch {}
  }

  async function remove(id: string) {
    try {
      await apiDelete(`history?id=${id}`);
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
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <header style={{ padding: "12px 20px", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800 }}>Watch History</h1>
        <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => window.location.href = "/home"}>
          Home
        </button>
      </header>
      <main style={{ padding: 24 }}>
        {items.length === 0 ? (
          <div className="empty-state">
            <h3>No Watch History</h3>
            <p>Your recently watched titles will appear here.</p>
            <Link className="btn btn-primary" href="/home">
              Browse Catalog
            </Link>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {items.map((item) => (
              <div key={item.id} className="card" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <h3 style={{ fontSize: 16, marginBottom: 4 }}>{item.title}</h3>
                  <p style={{ color: "var(--text-muted)", fontSize: 13 }}>
                    Position: {item.positionSeconds}s {item.completed ? " (Completed)" : ""}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  {!item.completed && (
                    <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => markCompleted(item.id)}>
                      Mark Complete
                    </button>
                  )}
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 12, borderColor: "var(--danger)", color: "var(--danger)" }}
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
