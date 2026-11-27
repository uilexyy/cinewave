import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchSubtitleContent } from "@/lib/addon-client";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  const user = token ? await validateSession(token) : null;
  const rl = await enforceRateLimit(req, RATE_LIMITS.playback, user?.id ?? null);
  if (rl) return rl;
  if (!user) return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url") || "";
  if (!url) return NextResponse.json({ success: false, message: "Missing url" }, { status: 400 });

  const result = await fetchSubtitleContent(url);
  if ("error" in result) {
    return NextResponse.json({ success: false, message: result.error }, { status: 400 });
  }
  return NextResponse.json({ success: true, data: { content: result.content, format: result.format } });
}
