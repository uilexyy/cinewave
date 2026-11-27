"use client";

import { useEffect, useState } from "react";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";

interface Addon {
  id: string;
  name: string;
  version?: string;
  description?: string;
  enabled: boolean;
  priority: number;
  healthStatus: string;
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [manifestUrl, setManifestUrl] = useState("");
  const [installing, setInstalling] = useState(false);

  async function loadAddons() {
    try {
      const data = await apiFetch<Addon[]>("addons");
      setAddons(data);
    } catch {}
    finally { setLoading(false); }
  }

  useEffect(() => { queueMicrotask(() => { void loadAddons(); }); }, []);

  async function handleInstall() {
    if (!manifestUrl.trim()) return;
    setInstalling(true);
    try {
      await apiPost("addons", { manifestUrl: manifestUrl.trim() });
      setManifestUrl("");
      await loadAddons();
    } catch {}
    finally { setInstalling(false); }
  }

  async function toggleAddon(addon: Addon) {
    try {
      await apiPatch(`addons/${addon.id}`, { enabled: !addon.enabled });
      await loadAddons();
    } catch {}
  }

  async function removeAddon(id: string) {
    if (!confirm("Hapus add-on ini?")) return;
    try { await apiDelete(`addons?id=${id}`); await loadAddons(); } catch {}
  }

  return (
    <main className="main-content fade-in">
      <div className="page page-narrow">
        <h1 style={{ fontSize: "clamp(28px, 4vw, 36px)", fontWeight: 800, letterSpacing: "-0.5px", marginBottom: 8 }}>Add-ons</h1>
        <p className="muted" style={{ marginBottom: 28, fontSize: 14 }}>Manage and install community streaming add-ons.</p>

        <div className="card" style={{ marginBottom: 32, padding: 24 }}>
          <h2 style={{ fontSize: 18, marginBottom: 12 }}>Install Add-on</h2>
          <div style={{ display: "flex", gap: 10 }}>
            <input className="input" placeholder="https://example.com/manifest.json" value={manifestUrl} onChange={(e) => setManifestUrl(e.target.value)} />
            <button className="btn btn-primary" onClick={handleInstall} disabled={installing}>
              {installing ? "Installing..." : "Install"}
            </button>
          </div>
        </div>

        <h2 style={{ fontSize: 20, marginBottom: 20 }}>Installed Add-ons</h2>
        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : addons.length === 0 ? (
          <div className="empty-state">
            <h3>No Add-ons</h3>
            <p>Install your first add-on to get started.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {addons.map((a) => (
              <div key={a.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                  <div>
                    <h3 style={{ fontSize: 16 }}>{a.name}</h3>
                    <p className="muted small">{a.description || "No description"}</p>
                  </div>
                  <span className={`status-dot ${a.healthStatus === "OK" ? "status-ok" : "status-error"}`} />
                </div>
                <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                  <span className="badge">v{a.version || "1.0"}</span>
                  <span className={`badge ${a.enabled ? "badge-ok" : ""}`}>{a.enabled ? "Enabled" : "Disabled"}</span>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="btn btn-secondary btn-sm" onClick={() => toggleAddon(a)}>{a.enabled ? "Disable" : "Enable"}</button>
                  <button className="btn btn-danger btn-sm" onClick={() => removeAddon(a.id)}>Remove</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}