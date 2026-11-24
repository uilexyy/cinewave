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

  const items = await prisma.watchlist.findMany({
    where: { userId: user.id },
    include: { title: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: items.map((w) => ({
      id: w.titleId,
      title: w.title?.title || `Konten ${w.titleId}`,
      type: w.title?.contentType || "MOVIE",
      posterUrl: w.title?.posterPath || null,
      releaseDate: w.title?.releaseDate || null,
      rating: w.title?.rating || null,
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

  const { titleId } = await req.json();
  if (!titleId) {
    return NextResponse.json({ success: false, message: "titleId required" }, { status: 400 });
  }

  if (!(await ensureTitle(titleId))) {
    return NextResponse.json({ success: false, message: "Invalid titleId" }, { status: 400 });
  }

  const existing = await prisma.watchlist.findFirst({
    where: { userId: user.id, titleId },
  });

  if (existing) {
    return NextResponse.json({ success: true, data: { already: true } });
  }

  await prisma.watchlist.create({
    data: { userId: user.id, titleId },
  });

  return NextResponse.json({ success: true, data: { already: false } });
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
  const titleId = searchParams.get("titleId");
  if (!titleId) {
    return NextResponse.json({ success: false, message: "titleId required" }, { status: 400 });
  }

  await prisma.watchlist.deleteMany({
    where: { userId: user.id, titleId },
  });

  return NextResponse.json({ success: true });
}
