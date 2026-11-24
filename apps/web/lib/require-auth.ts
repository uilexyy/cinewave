import { NextRequest, NextResponse } from "next/server";
import { extractTokenFromRequest, validateSession } from "./auth";
import { User } from "@cinewave/types";

export type AuthenticatedHandler = (
  req: NextRequest,
  context: { user: User }
) => Promise<NextResponse>;

export function withAuth(handler: AuthenticatedHandler) {
  return async (req: NextRequest) => {
    const token = extractTokenFromRequest(req);
    if (!token) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    const user = await validateSession(token);
    if (!user) {
      return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    return handler(req, { user });
  };
}
