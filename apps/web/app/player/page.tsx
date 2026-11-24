"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function PlayerContent() {
  const params = useSearchParams();
  const src = params.get("src");
  const title = params.get("title") || "CineWave Player";

  if (!src) {
    return (
      <div className="loading" style={{ minHeight: "100vh" }}>
        <p>No source provided.</p>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", background: "#000", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 20px", background: "var(--surface)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span className="logo">CineWave</span>
        <span style={{ color: "var(--text-muted)", fontSize: 14 }}>{title}</span>
      </div>
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <video
          src={src}
          controls
          autoPlay
          playsInline
          style={{ width: "100%", maxWidth: "1200px", maxHeight: "100%" }}
        />
      </div>
    </div>
  );
}

export default function PlayerPage() {
  return (
    <Suspense fallback={<div className="loading"><div className="spinner" /></div>}>
      <PlayerContent />
    </Suspense>
  );
}
