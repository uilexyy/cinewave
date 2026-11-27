import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

async function ensureTitle(titleId: string): Promise<boolean> {
  await prisma.title.upsert({
    where: { id: titleId },
    update: {
      externalId: titleId,
      title: `Konten ${titleId}`,
      contentType: "MOVIE",
    },
    create: {
      id: titleId,
      externalId: titleId,
      title: `Konten ${titleId}`,
      contentType: "MOVIE",
    },
  });
  return true;
}

async function ensureEpisode(
  episodeId: string,
  titleId: string,
  seasonNumber: number,
  episodeNumber: number,
  episodeTitle?: string
): Promise<boolean> {
  let season = await prisma.season.findFirst({ where: { titleId, seasonNumber } });
  if (!season) {
    season = await prisma.season.create({ data: { titleId, seasonNumber } });
  }

  const name = episodeTitle || `Episode ${episodeNumber}`;
  await prisma.episode.upsert({
    where: { id: episodeId },
    update: {
      name,
      seasonId: season.id,
      episodeNumber,
    },
    create: {
      id: episodeId,
      seasonId: season.id,
      episodeNumber,
      name,
    },
  });
  return true;
}

async function resolveVideoSourceId(
  titleId: string,
  episodeId: string | null,
  sourceUrl: string | null,
  format: string | null,
  quality: string | null,
  fallbackSourceId: string | null
): Promise<string | null> {
  if (sourceUrl) {
    let source = await prisma.videoSource.findFirst({ where: { titleId, sourceUrl } });
    if (!source) {
      source = await prisma.videoSource.create({
        data: {
          titleId,
          episodeId,
          sourceUrl,
          format: format || null,
          quality: quality || null,
        },
      });
    }
    return source.id;
  }

  if (fallbackSourceId) {
    const existing = await prisma.videoSource.findUnique({ where: { id: fallbackSourceId } });
    if (existing) return fallbackSourceId;
  }

  return null;
}

export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.playback, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { titleId, episodeId, sourceId, sourceUrl, format, quality } = await req.json();
  if (!titleId) {
    return NextResponse.json({ success: false, message: "titleId required" }, { status: 400 });
  }

  try {
    await ensureTitle(titleId);

    if (episodeId) {
      const parts = String(episodeId).split(":");
      const seasonNumber = Number(parts[1] ?? 1) || 1;
      const episodeNumber = Number(parts[2] ?? 1) || 1;
      await ensureEpisode(episodeId, titleId, seasonNumber, episodeNumber);
    }

    const resolvedSourceId = await resolveVideoSourceId(
      titleId,
      episodeId || null,
      sourceUrl || null,
      format || null,
      quality || null,
      sourceId || null
    );

    const session = await prisma.playbackSession.create({
      data: {
        userId: user.id,
        titleId,
        episodeId: episodeId || null,
        sourceId: resolvedSourceId,
      },
    });

    return NextResponse.json({ success: true, data: { sessionId: session.id } });
  } catch (error: unknown) {
    console.error("Playback session creation failed:", error);
    return NextResponse.json(
      { success: false, message: "Gagal menyimpan sesi pemutaran" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.playback, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { sessionId } = await req.json();
  if (!sessionId) {
    return NextResponse.json({ success: false, message: "sessionId required" }, { status: 400 });
  }

  const session = await prisma.playbackSession.findUnique({ where: { id: sessionId } });
  if (!session || session.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  await prisma.playbackSession.update({
    where: { id: sessionId },
    data: { endedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
