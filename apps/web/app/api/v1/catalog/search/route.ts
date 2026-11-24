import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonCatalog } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "";
  const page = Number(searchParams.get("page") || "1");

  if (!query) {
    return NextResponse.json({ success: true, data: { results: [] } });
  }

  const addons = await prisma.userAddon.findMany({
    where: { userId: user.id, enabled: true },
    orderBy: { priority: "desc" },
  });

  const allResults: any[] = [];

  for (const addon of addons) {
    let manifestUrl: string;
    try {
      manifestUrl = decryptUrl(addon.manifestUrlEncrypted);
    } catch {
      continue;
    }
    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) continue;

    const catalogs = result.manifest.catalogs || [];
    for (const cat of catalogs) {
      const items = await fetchAddonCatalog(manifestUrl, result.manifest, cat.type, cat.id, { search: query });
      for (const item of items) {
        allResults.push({ ...item, addonId: addon.id, addonName: addon.name });
      }
    }
  }

  return NextResponse.json({
    success: true,
    data: {
      page,
      totalPages: 1,
      totalResults: allResults.length,
      results: allResults,
    },
  });
}
