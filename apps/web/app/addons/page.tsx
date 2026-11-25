"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch, apiPost, apiPatch, apiDelete } from "@/services/api";

interface Addon {
  id: string;
  name: string;
  version?: string;
  description?: string;
  enabled: boolean;
  priority: number;
  healthStatus: string;
  installedAt: string;
  lastCheckedAt?: string;
}

interface AddonPreviewManifest {
  name?: string;
  description?: string;
  version?: string;
  resources?: string[];
  types?: string[];
}

interface AddonPreview {
  manifest?: AddonPreviewManifest;
  warnings?: string[];
}

export default function AddonsPage() {
  const [addons, setAddons] = useState<Addon[]>([]);
  const [loading, setLoading] = useState(true);
  const [manifestUrl, setManifestUrl] = useState("");
  const [installing, setInstalling] = useState(false);
  const [preview, setPreview] = useState<AddonPreview | null>(null);
  const [message, setMessage] = useState("");

  async function loadAddons() {
    try {
      const data = await apiFetch<Addon[]>("addons");
      setAddons(data);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    apiFetch<Addon[]>("addons")
      .then((data) => setAddons(data))
      .catch((e: unknown) => setMessage(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, []);

  async function handlePreview() {
    if (!manifestUrl.trim()) {
      setMessage("Masukkan URL manifest.");
      return;
    }
    setMessage("");
    setPreview(null);
    try {
      const data = await apiPost<AddonPreview>("addons/preview", {
        manifestUrl: manifestUrl.trim(),
      });
      setPreview(data);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function handleInstall() {
    if (!manifestUrl.trim()) {
      setMessage("Masukkan URL manifest.");
      return;
    }
    setInstalling(true);
    setMessage("");
    try {
      await apiPost("addons", { manifestUrl: manifestUrl.trim() });
      setMessage("Add-on berhasil dipasang.");
      setManifestUrl("");
      setPreview(null);
      await loadAddons();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setInstalling(false);
    }
  }

  async function toggleAddon(addon: Addon) {
    try {
      await apiPatch(`addons/${addon.id}`, { enabled: !addon.enabled });
      await loadAddons();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function refreshAddon(addon: Addon) {
    try {
      await apiPost(`addons/${addon.id}/refresh`, {});
      await loadAddons();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function removeAddon(id: string) {
    if (!confirm("Hapus add-on ini?")) return;
    try {
      await apiDelete(`addons?id=${id}`);
      await loadAddons();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
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
        <Link href="/addons" className="active">Add-ons</Link>
        <Link href="/profile">Profile</Link>
      </aside>

      <main className="main-content fade-in">
        <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 8 }}>Add-ons</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: 24 }}>
          Manage your streaming add-ons. Install, enable, refresh, or remove.
        </p>

        {message && (
          <div
            style={{
              padding: "12px 16px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              marginBottom: 20,
              color: "var(--text-muted)",
            }}
          >
            {message}
          </div>
        )}

        {/* Install form */}
        <div className="card" style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 16 }}>Install New Add-on</h2>
          <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
            <input
              className="input"
              placeholder="https://example.com/manifest.json"
              value={manifestUrl}
              onChange={(e) => setManifestUrl(e.target.value)}
            />
            <button className="btn btn-ghost" onClick={handlePreview} style={{ whiteSpace: "nowrap" }}>
              Preview
            </button>
            <button
              className="btn btn-primary"
              onClick={handleInstall}
              disabled={installing}
              style={{ whiteSpace: "nowrap" }}
            >
              {installing ? "Installing..." : "Install"}
            </button>
          </div>

          {preview && (
            <div
              style={{
                padding: 16,
                background: "var(--surface-2)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border)",
              }}
            >
              <h3 style={{ fontSize: 16, marginBottom: 6 }}>{preview.manifest?.name}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 8 }}>
                {preview.manifest?.description || "No description"}
              </p>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <span className="badge">v{preview.manifest?.version}</span>
                {(preview.manifest?.resources || []).map((r: string) => (
                  <span key={r} className="badge">{r}</span>
                ))}
                {(preview.manifest?.types || []).map((t: string) => (
                  <span key={t} className="badge">{t}</span>
                ))}
              </div>
              {preview.warnings && preview.warnings.length > 0 && (
                <p style={{ color: "var(--accent-2)", fontSize: 12, marginTop: 8 }}>
                  Warnings: {preview.warnings.join(", ")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Installed add-ons */}
        <h2 style={{ fontSize: 20, marginBottom: 16 }}>Installed Add-ons</h2>
        {addons.length === 0 ? (
          <div className="empty-state">
            <h3>No Add-ons Installed</h3>
            <p>Install an add-on above to start streaming.</p>
          </div>
        ) : (
          <div className="grid grid-2">
            {addons.map((addon) => (
              <div key={addon.id} className="card">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <h3 style={{ fontSize: 16 }}>{addon.name}</h3>
                  <span className={`status-dot ${addon.healthStatus === "OK" ? "status-ok" : addon.healthStatus === "ERROR" ? "status-error" : "status-unknown"}`} />
                </div>
                <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 12 }}>
                  {addon.description || "No description"}
                </p>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  <span className="badge">v{addon.version || "unknown"}</span>
                  <span className="badge">{addon.enabled ? "Enabled" : "Disabled"}</span>
                  <span className="badge">{addon.healthStatus}</span>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => toggleAddon(addon)}>
                    {addon.enabled ? "Disable" : "Enable"}
                  </button>
                  <button className="btn btn-ghost" style={{ padding: "6px 12px", fontSize: 12 }} onClick={() => refreshAddon(addon)}>
                    Refresh
                  </button>
                  <button
                    className="btn btn-ghost"
                    style={{ padding: "6px 12px", fontSize: 12, borderColor: "var(--danger)", color: "var(--danger)" }}
                    onClick={() => removeAddon(addon.id)}
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
