import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, validateSession } from "@/lib/auth";
import { fetchManifest } from "@/lib/addon-service";

export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (!token) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }
  const user = await validateSession(token);
  if (!user) {
    return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
  }

  const { manifestUrl } = await req.json();
  if (!manifestUrl || typeof manifestUrl !== "string") {
    return NextResponse.json({ success: false, message: "manifestUrl required" }, { status: 400 });
  }

  try {
    new URL(manifestUrl);
  } catch {
    return NextResponse.json({ success: false, message: "Invalid URL" }, { status: 400 });
  }

  const result = await fetchManifest(manifestUrl);

  if (!result.valid) {
    return NextResponse.json(
      { success: false, message: "Manifest validation failed", errors: result.errors, warnings: result.warnings },
      { status: 422 }
    );
  }

  return NextResponse.json({
    success: true,
    data: { manifest: result.manifest, warnings: result.warnings },
  });
}
