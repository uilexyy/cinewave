"use client";

import { PLATFORMS } from "@/lib/catalog-categories";

interface Props {
  selected: string;
  onSelect: (platform: string) => void;
  available: string[];
}

export default function PlatformSelector({ selected, onSelect, available }: Props) {
  const platforms = available.length > 0 ? available : Object.keys(PLATFORMS);
  return (
    <div className="platform-selector">
      <button
        className={`platform-chip ${selected === "" ? "platform-chip-active" : ""}`}
        onClick={() => onSelect("")}
      >
        All
      </button>
      {platforms.map((key) => {
        const p = (PLATFORMS as Record<string, { name: string; logo: string; color: string }>)[key];
        if (!p) return null;
        return (
          <button
            key={key}
            className={`platform-chip ${selected === key ? "platform-chip-active" : ""}`}
            onClick={() => onSelect(key)}
          >
            <span className="platform-logo" style={{ background: p.color, color: p.color === "#FFFFFF" ? "#000" : "#fff" }}>{p.logo}</span>
            {p.name}
          </button>
        );
      })}
    </div>
  );
}
