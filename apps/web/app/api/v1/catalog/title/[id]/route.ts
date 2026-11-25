import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonMeta } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;

  const rl = await enforceRateLimit(req, RATE_LIMITS.catalog, user?.id ?? null);
  if (rl) return rl;

  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "movie";
  const addonId = searchParams.get("addonId") || "";
  const { id } = await params;

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

  for (const addon of addons) {
    let manifestUrl: string;
    try {
      manifestUrl = decryptUrl(addon.manifestUrlEncrypted);
    } catch {
      continue;
    }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) continue;
    const meta = await fetchAddonMeta(manifestUrl, result.manifest, type, id);
    if (meta) {
      return NextResponse.json({ success: true, data: { ...meta, addonId: addon.id, addonName: addon.name } });
    }
  }

  return NextResponse.json({ success: false, message: "Metadata not found in any addon" }, { status: 404 });
}
