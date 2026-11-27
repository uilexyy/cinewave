import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";
import { fetchAddonSubtitles, isSafeSubtitleUrl, getBaseUrl } from "@/lib/addon-client";
import { decryptUrl } from "@/lib/addon-crypto";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest, { params }: { params: Promise<{ titleId: string }> }) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;
  const rl = await enforceRateLimit(req, RATE_LIMITS.playback, user?.id ?? null);
  if (rl) return rl;
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { titleId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "movie";
  const episodeId = searchParams.get("episodeId");
  const addonId = searchParams.get("addonId") || "";

  // Get all user addons to check installed/disabled status
  const allAddons = await prisma.userAddon.findMany({ where: { userId: user.id } });
  const addons = allAddons.filter(a => a.enabled);
  if (addonId) {
    const preferred = addons.find((a) => a.id === addonId);
    if (preferred) { const rest = addons.filter((a) => a.id !== addonId); addons.length = 0; addons.push(preferred, ...rest); }
  }

  interface PlaybackSubtitle { id: string; language?: string; format: string; url?: string; content?: string; source?: string; addonId?: string; }
  const subtitles: PlaybackSubtitle[] = [];
  const diagnostics: Array<{
    addon: string;
    active: boolean;
    resourceSubtitle: boolean;
    requestStatus: string;
    requestError?: string;
    subtitlesFound: number;
    reason: string;
  }> = [];

  const contentId = episodeId ? episodeId : titleId;

  for (const addon of allAddons) {
    const active = addon.enabled;
    if (!active) {
      diagnostics.push({
        addon: addon.name,
        active: false,
        resourceSubtitle: false,
        requestStatus: "SKIPPED",
        subtitlesFound: 0,
        reason: "Add-on nonaktif"
      });
      continue;
    }

    let manifestUrl: string;
    try {
      manifestUrl = decryptUrl(addon.manifestUrlEncrypted);
    } catch {
      diagnostics.push({
        addon: addon.name,
        active: true,
        resourceSubtitle: false,
        requestStatus: "FAILED",
        subtitlesFound: 0,
        reason: "Manifest URL decryption failed"
      });
      continue;
    }

    const result = await fetchManifest(manifestUrl);
    if (!result.valid || !result.manifest) {
      diagnostics.push({
        addon: addon.name,
        active: true,
        resourceSubtitle: false,
        requestStatus: "FAILED",
        subtitlesFound: 0,
        reason: "Manifest tidak dapat diakses atau tidak valid"
      });
      continue;
    }

    const supportsSubtitles = (result.manifest.resources || []).some((r) =>
      typeof r === "string" ? r === "subtitles" : r.name === "subtitles"
    );

    if (!supportsSubtitles) {
      diagnostics.push({
        addon: addon.name,
        active: true,
        resourceSubtitle: false,
        requestStatus: "SKIPPED",
        subtitlesFound: 0,
        reason: "Manifest tidak mendukung subtitles"
      });
      continue;
    }

    try {
      const subs = await fetchAddonSubtitles(manifestUrl, result.manifest, type, contentId);
      const addonBase = getBaseUrl(manifestUrl);
      let validCount = 0;

      for (const sub of subs) {
        let url = sub.url || "";
        if (url && !/^https?:\/\//i.test(url)) {
          try {
            url = new URL(url, addonBase).toString();
          } catch {
            url = "";
          }
        }
        if (url && !isSafeSubtitleUrl(url)) {
          url = "";
        }
        if (!url && !sub.content) continue;
        if (!sub.lang) continue;

        validCount++;
        subtitles.push({
          id: `${addon.id}-${subtitles.length}`,
          language: sub.lang,
          format: "vtt",
          url,
          content: sub.content,
          source: addon.name,
          addonId: addon.id,
        });
      }

      diagnostics.push({
        addon: addon.name,
        active: true,
        resourceSubtitle: true,
        requestStatus: "SUCCESS",
        subtitlesFound: validCount,
        reason: validCount > 0 ? "OK" : "Request berhasil tetapi tidak menemukan subtitle"
      });
    } catch {
      diagnostics.push({
        addon: addon.name,
        active: true,
        resourceSubtitle: true,
        requestStatus: "FAILED",
        subtitlesFound: 0,
        reason: "Request subtitle gagal"
      });
    }
  }

  return NextResponse.json({ success: true, data: { subtitles, diagnostics } });
}
