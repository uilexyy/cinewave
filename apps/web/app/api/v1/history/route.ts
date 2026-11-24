import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";


async function ensureTitle(titleId: string): Promise<boolean> {
  const existing = await prisma.title.findUnique({ where: { id: titleId } });
  if (existing) return true;

  await prisma.title.create({
    data: {
      id: titleId,
      title: `Konten ${titleId}`,
      externalId: titleId,
      contentType: "MOVIE",
    },
  });
  return true;
}

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const progress = await prisma.watchProgress.findMany({
    where: { userId: user.id },
    include: { title: true, episode: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: progress.map((p) => ({
      id: p.id,
      titleId: p.titleId,
      episodeId: p.episodeId,
      title: p.title?.title || `Konten ${p.titleId}`,
      episodeNumber: p.episodeId ? p.episode?.episodeNumber : null,
      positionSeconds: p.positionSeconds,
      durationSeconds: p.durationSeconds,
      completed: p.completed,
    })),
  });
}

export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { titleId, episodeId, positionSeconds = 0 } = await req.json();
  if (!titleId) {
    return NextResponse.json({ success: false, message: "titleId required" }, { status: 400 });
  }
  if (!(await ensureTitle(titleId))) {
    return NextResponse.json({ success: false, message: "Invalid titleId" }, { status: 400 });
  }

  const existing = await prisma.watchProgress.findFirst({
    where: {
      userId: user.id,
      titleId,
      episodeId: episodeId || null,
    },
  });

  let progress;
  if (existing) {
    progress = await prisma.watchProgress.update({
      where: { id: existing.id },
      data: {
        positionSeconds,
        updatedAt: new Date(),
      },
    });
  } else {
    progress = await prisma.watchProgress.create({
      data: {
        userId: user.id,
        titleId,
        episodeId: episodeId || null,
        positionSeconds,
        durationSeconds: 0,
        completed: false,
      },
    });
  }

  return NextResponse.json({ success: true, data: { progress } });
}

export async function PATCH(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });
  }

  const { completed } = await req.json();
  const existing = await prisma.watchProgress.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  await prisma.watchProgress.update({
    where: { id },
    data: { completed },
  });

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });
  }

  const existing = await prisma.watchProgress.findUnique({ where: { id } });
  if (!existing || existing.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  await prisma.watchProgress.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
