import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, invalidateSession } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const token = extractTokenFromRequest(req);
  if (token) {
    await invalidateSession(token);
  }

  const response = NextResponse.json({ success: true, message: "Logout berhasil" });
  response.cookies.delete("cinewave_session");
  response.cookies.delete("XSRF-TOKEN");
  return response;
}
