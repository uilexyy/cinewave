import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { encryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.api, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id },
    orderBy: { priority: "desc" },
  });

  return NextResponse.json({
    success: true,
    data: addons.map((a) => ({
      id: a.id,
      name: a.name,
      version: a.version,
      description: a.description,
      enabled: a.enabled,
      priority: a.priority,
      healthStatus: a.healthStatus,
      installedAt: a.installedAt,
      lastCheckedAt: a.lastCheckedAt,
    })),
  });
}

export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.addonInstall, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { manifestUrl, name } = await req.json();
  if (!manifestUrl || typeof manifestUrl !== "string") {
    return NextResponse.json({ success: false, message: "manifestUrl required" }, { status: 400 });
  }

  const result = await fetchManifest(manifestUrl);
  if (!result.valid || !result.manifest) {
    return NextResponse.json(
      { success: false, message: "Invalid manifest", errors: result.errors },
      { status: 422 }
    );
  }

  const addonName = name || result.manifest.name;

  const existing = await prisma.userAddon.findFirst({
    where: { userId: user.id, name: addonName },
  });
  if (existing) {
    return NextResponse.json(
      { success: false, message: "Add-on already installed" },
      { status: 409 }
    );
  }

  const addon = await prisma.userAddon.create({
    data: {
      userId: user.id,
      name: addonName,
      manifestUrlEncrypted: encryptUrl(manifestUrl),
      version: result.manifest.version,
      description: result.manifest.description,
      enabled: true,
      priority: 0,
      healthStatus: "UNKNOWN",
    },
  });

  return NextResponse.json({
    success: true,
    data: {
      id: addon.id,
      name: addon.name,
      version: addon.version,
      description: addon.description,
      enabled: addon.enabled,
    },
  });
}

export async function DELETE(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.api, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ success: false, message: "id required" }, { status: 400 });
  }

  const addon = await prisma.userAddon.findUnique({ where: { id } });
  if (!addon || addon.userId !== user.id) {
    return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
  }

  await prisma.userAddon.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
