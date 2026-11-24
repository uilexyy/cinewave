import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { titleId, episodeId, sourceId } = await req.json();
  if (!titleId) {
    return NextResponse.json({ success: false, message: "titleId required" }, { status: 400 });
  }

  const session = await prisma.playbackSession.create({
    data: {
      userId: user.id,
      titleId,
      episodeId: episodeId || null,
      sourceId: sourceId || null,
    },
  });

  return NextResponse.json({ success: true, data: { sessionId: session.id } });
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
