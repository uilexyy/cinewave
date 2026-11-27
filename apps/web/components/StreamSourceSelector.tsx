"use client";

export interface StreamSource {
  id: string;
  sourceUrl?: string | null;
  externalUrl?: string | null;
  format?: string;
  quality?: string;
  providerName?: string;
  addonId?: string;
  isPlayable?: boolean;
  name?: string;
  title?: string;
  description?: string;
  behaviorHints?: Record<string, unknown>;
}

interface Props {
  streams: StreamSource[];
  selectedId: string | null;
  onSelect: (stream: StreamSource) => void;
  onPlay: (stream: StreamSource) => void;
}

function hintLabel(stream: StreamSource): string | null {
  const hints = stream.behaviorHints;
  if (!hints) return null;
  const parts: string[] = [];
  const lang = hints.language ?? hints.lang;
  const codec = hints.codec ?? hints.videoCodec;
  if (typeof lang === "string" && lang) parts.push(lang.toUpperCase());
  if (typeof codec === "string" && codec) parts.push(codec.toUpperCase());
  if (hints.notWebReady === true) parts.push("External player");
  if (hints.proxyHeaders) parts.push("Proxy headers");
  return parts.length ? parts.join(" · ") : null;
}

export default function StreamSourceSelector({ streams, selectedId, onSelect, onPlay }: Props) {
  if (streams.length === 0) {
    return (
      <div className="empty-state">
        <h3>No Streams Available</h3>
        <p>No playable sources found for this content.</p>
      </div>
    );
  }

  return (
    <div className="stream-selector">
      <div className="section-header">
        <h2 className="section-title" style={{ fontSize: 18 }}>Available Streams</h2>
        <span className="small dim">{streams.length} source{streams.length === 1 ? "" : "s"}</span>
      </div>
      <div className="stream-source-list">
        {streams.map((s) => {
          const selected = selectedId === s.id;
          return (
            <div
              key={s.id}
              className={`stream-source-card ${selected ? "selected" : ""}`}
              onClick={() => onSelect(s)}
            >
              <div className="stream-source-info">
                <div className="stream-source-addon">{s.providerName || "Unknown add-on"}</div>
                <div className="stream-source-name">{s.name || s.title || s.description || "Stream"}</div>
                <div className="stream-source-badges">
                  {s.quality && s.quality !== "Unknown" && <span className="badge" style={{ padding: "2px 8px", fontSize: 11 }}>{s.quality}</span>}
                  {s.format && <span className="badge" style={{ padding: "2px 8px", fontSize: 11 }}>{s.format.toUpperCase()}</span>}
                  {hintLabel(s) && <span className="small dim" style={{ fontSize: 11 }}>{hintLabel(s)}</span>}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-primary"
                onClick={(e) => { e.stopPropagation(); onPlay(s); }}
              >
                Play
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
