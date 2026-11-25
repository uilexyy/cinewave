import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonStreams, fetchAddonSubtitles, getStreamPlayableUrl, fetchSubtitleContent } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ titleId: string }> }) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.playback, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { titleId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "movie";
  const episodeId = searchParams.get("episodeId");
  const addonId = searchParams.get("addonId") || "";

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });
  if (addonId) {
    const preferred = addons.find((a) => a.id === addonId);
    if (preferred) {
      const rest = addons.filter((a) => a.id !== addonId);
      addons.length = 0;
      addons.push(preferred, ...rest);
    }
  }

  interface PlaybackSource {
    id: string;
    sourceUrl: string | null;
    format: string;
    quality: string;
    providerName: string;
    legalStatus: string;
    isPlayable: boolean;
    externalUrl: string | null;
    name?: string;
    title?: string;
    description?: string;
  }
  interface PlaybackSubtitle {
    id: string;
    language?: string;
    format: string;
    url?: string;
    content?: string;
    source?: string;
  }
  const sources: PlaybackSource[] = [];
  const subtitles: PlaybackSubtitle[] = [];

  const contentId = episodeId ? episodeId : titleId;

  for (const addon of addons) {
    let manifestUrl: string;
    try {
      manifestUrl = decryptUrl(addon.manifestUrlEncrypted);
    } catch {
      continue;
    }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) continue;

    const streams = await fetchAddonStreams(manifestUrl, result.manifest, type, contentId);
    for (const stream of streams) {
      const playableUrl = getStreamPlayableUrl(stream);
      sources.push({
        id: `${addon.id}-${sources.length}`,
        sourceUrl: playableUrl || stream.externalUrl || stream.url || null,
        format: stream.url ? "direct" : stream.externalUrl ? "external" : "unknown",
        quality: stream.name || "Unknown",
        providerName: addon.name,
        legalStatus: "APPROVED",
        isPlayable: !!playableUrl,
        externalUrl: stream.externalUrl || null,
        name: stream.name,
        title: stream.title,
        description: stream.description,
      });
    }

    const subs = await fetchAddonSubtitles(manifestUrl, result.manifest, type, contentId);
    for (const sub of subs) {
      if (!sub.url) continue;
      const fetched = await fetchSubtitleContent(sub.url);
      subtitles.push({
        id: `${addon.id}-${subtitles.length}`,
        language: sub.lang,
        format: "vtt",
        url: sub.url,
        source: addon.name,
        ...("content" in fetched ? { content: fetched.content } : {}),
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { sources, subtitles },
  });
}
