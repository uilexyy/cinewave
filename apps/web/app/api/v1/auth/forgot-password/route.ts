import { NextRequest, NextResponse } from "next/server";
import { ForgotPasswordSchema } from "@cinewave/validation";
import { prisma } from "@/lib/db";
import crypto from "crypto";
import { hashToken } from "@/lib/auth";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const rl = await enforceRateLimit(req, RATE_LIMITS.api);
  if (rl) return rl;

  try {
    const body = await req.json();
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Email tidak valid" },
        { status: 400 }
      );
    }

    const { email } = parsed.data;

    // Anti-enumeration: always return the same success message.
    const user = await prisma.user.findUnique({ where: { email } });

    let resetToken: string | undefined;

    if (user) {
      const token = crypto.randomBytes(32).toString("hex");
      const tokenHash = hashToken(token);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });
      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      });

      // In non-production environments, return the token to allow functional testing.
      if (process.env.NODE_ENV !== "production") {
        resetToken = token;
      }
    }

    return NextResponse.json({
      success: true,
      message: "Jika email terdaftar, instruksi reset password akan dikirim.",
      ...(resetToken ? { resetToken } : {}),
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json({ success: false, message: "Terjadi kesalahan server" }, { status: 500 });
  }
}
