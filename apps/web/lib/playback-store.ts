export interface PlayerSubtitle {
  url: string;
  lang: string;
}

export interface PendingPlayback {
  src: string;
  title: string;
  titleId?: string;
  subtitles: PlayerSubtitle[];
}

let pending: PendingPlayback | null = null;

export function setPendingPlayback(data: PendingPlayback): void {
  pending = data;
}

export function getPendingPlayback(): PendingPlayback | null {
  return pending;
}

export function clearPendingPlayback(): void {
  pending = null;
}
