import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonStreams, fetchAddonSubtitles, getStreamPlayableUrl } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";

export async function GET(req: NextRequest, { params }: { params: Promise<{ titleId: string }> }) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { titleId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "movie";
  const episodeId = searchParams.get("episodeId");

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });

  const sources: any[] = [];
  const subtitles: any[] = [];

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
        sourceUrl: playableUrl || stream.externalUrl || stream.url,
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
      subtitles.push({
        id: `${addon.id}-${subtitles.length}`,
        language: sub.lang,
        format: "vtt",
        url: sub.url,
      });
    }
  }

  return NextResponse.json({
    success: true,
    data: { sources, subtitles },
  });
}
