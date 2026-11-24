import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { decryptUrl } from "@/lib/addon-crypto";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const addon = await prisma.userAddon.findUnique({ where: { id } });
  if (!addon || addon.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const url = decryptUrl(addon.manifestUrlEncrypted);

  try {
    const result = await fetchManifest(url);
    return NextResponse.json({ success: true, data: { valid: result.valid } });
  } catch {
    return NextResponse.json({ success: false, data: { valid: false } });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = extractTokenFromRequest(req);
  if (!token) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  const user = await validateSession(token);
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const addon = await prisma.userAddon.findUnique({ where: { id } });
  if (!addon || addon.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  const url = decryptUrl(addon.manifestUrlEncrypted);
  const result = await fetchManifest(url);

  await prisma.userAddon.update({
    where: { id },
    data: {
      lastCheckedAt: new Date(),
      healthStatus: result.valid ? "OK" : "ERROR",
      version: result.manifest?.version || addon.version,
      description: result.manifest?.description || addon.description,
    },
  });

  await prisma.addonHealthCheck.create({
    data: {
      addonId: id,
      status: result.valid ? "OK" : "ERROR",
      errorCode: result.errors[0] || null,
    },
  });

  return NextResponse.json({
    success: true,
    data: { valid: result.valid, errors: result.errors, manifest: result.manifest },
  });
}
