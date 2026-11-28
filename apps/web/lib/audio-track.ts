export type AudioLangPref = "auto" | "id" | "en";

export interface AudioTrackInfo {
  id: number;
  name: string;
  lang?: string;
  default?: boolean;
  autoselect?: boolean;
}

export function normalizeAudioLanguage(raw: string | undefined | null): "en" | "id" | null {
  if (!raw) return null;
  const v = raw.trim().toLowerCase().replace(/_/g, "-");
  if (v.startsWith("en")) return "en";
  if (v.startsWith("id") || v.startsWith("ind") || v === "in") return "id";
  return null;
}

export function pickAudioTrack(tracks: AudioTrackInfo[], pref: AudioLangPref): number {
  if (tracks.length === 0) return -1;
  if (pref !== "auto") {
    const target = pref === "id" ? "id" : "en";
    const match = tracks.find((t) => normalizeAudioLanguage(t.lang) === target || normalizeAudioLanguage(t.name) === target);
    if (match) return match.id;
  }
  const def = tracks.find((t) => t.default || t.autoselect);
  return (def ?? tracks[0]).id;
}
