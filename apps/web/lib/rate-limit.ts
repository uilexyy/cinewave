import { prisma } from "./db";
import { NextRequest, NextResponse } from "next/server";

export interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

export const RATE_LIMITS = {
  login: { windowMs: 15 * 60 * 1000, max: 10, keyPrefix: "login" },
  register: { windowMs: 60 * 60 * 1000, max: 5, keyPrefix: "register" },
  addonPreview: { windowMs: 60 * 1000, max: 10, keyPrefix: "addon-preview" },
  addonInstall: { windowMs: 60 * 1000, max: 10, keyPrefix: "addon-install" },
  addonRefresh: { windowMs: 60 * 1000, max: 10, keyPrefix: "addon-refresh" },
  catalog: { windowMs: 60 * 1000, max: 100, keyPrefix: "catalog" },
  search: { windowMs: 60 * 1000, max: 60, keyPrefix: "search" },
  playback: { windowMs: 60 * 1000, max: 60, keyPrefix: "playback" },
  api: { windowMs: 60 * 1000, max: 120, keyPrefix: "api" },
} as const satisfies Record<string, RateLimitConfig>;

function getClientIp(req: NextRequest): string {
  // Only trust X-Forwarded-For when explicitly configured.
  // In most deployments behind a trusted proxy (Vercel, nginx), set TRUST_PROXY=true.
  const trustProxy = process.env.TRUST_PROXY === "true";
  if (trustProxy) {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) {
      const first = forwarded.split(",")[0]?.trim();
      if (first) return first;
    }
    const realIp = req.headers.get("x-real-ip");
    if (realIp) return realIp.trim();
  }
  // Fallback: use a generic key for anonymous when IP not reliably available
  return "unknown";
}

export function getRateLimitIdentity(req: NextRequest, userId?: string | null): string {
  const ip = getClientIp(req);
  if (userId) return `user:${userId}:ip:${ip}`;
  return `ip:${ip}`;
}

export async function checkRateLimit(
  identity: string,
  config: RateLimitConfig
): Promise<{ allowed: boolean; remaining: number; resetAt: Date; limit: number }> {
  const key = `${config.keyPrefix}:${identity}`;
  const now = new Date();
  const resetAt = new Date(now.getTime() + config.windowMs);

  // Atomic upsert+increment using raw SQL to avoid race conditions.
  // If key exists and window not expired, increment if under limit.
  // If key exists but expired, reset window.
  // If key doesn't exist, insert.
  const rows = await prisma.$queryRaw<Array<{ count: number; reset_at: Date }>>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt", "createdAt", "updatedAt")
    VALUES (${key}, 1, ${resetAt}, ${now}, ${now})
    ON CONFLICT ("key") DO UPDATE SET
      "count" = CASE
        WHEN "RateLimit"."resetAt" <= ${now} THEN 1
        ELSE "RateLimit"."count" + 1
      END,
      "resetAt" = CASE
        WHEN "RateLimit"."resetAt" <= ${now} THEN ${resetAt}
        ELSE "RateLimit"."resetAt"
      END,
      "updatedAt" = ${now}
    RETURNING "count", "resetAt" as "reset_at"
  `;

  const row = rows[0];
  if (!row) {
    // Should not happen; fail closed (deny) to be safe
    return { allowed: false, remaining: 0, resetAt, limit: config.max };
  }

  const count = Number(row.count);
  const actualResetAt = new Date(row.reset_at);
  const allowed = count <= config.max;
  const remaining = Math.max(0, config.max - count);

  return { allowed, remaining, resetAt: actualResetAt, limit: config.max };
}

export function rateLimitResponse(
  result: { remaining: number; resetAt: Date; limit: number }
): NextResponse {
  const retryAfter = Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000));
  return NextResponse.json(
    { success: false, message: "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": "0",
        "X-RateLimit-Reset": String(Math.ceil(result.resetAt.getTime() / 1000)),
      },
    }
  );
}

export function setRateLimitHeaders(
  res: NextResponse,
  result: { remaining: number; resetAt: Date; limit: number }
): NextResponse {
  res.headers.set("X-RateLimit-Limit", String(result.limit));
  res.headers.set("X-RateLimit-Remaining", String(Math.max(0, result.remaining)));
  res.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetAt.getTime() / 1000)));
  return res;
}

export async function enforceRateLimit(
  req: NextRequest,
  config: RateLimitConfig,
  userId?: string | null
): Promise<NextResponse | null> {
  // Allow disabling rate limiting for test environments
  if (process.env.RATE_LIMIT_DISABLED === "true") {
    return null;
  }

  try {
    const identity = getRateLimitIdentity(req, userId);
    const result = await checkRateLimit(identity, config);
    if (!result.allowed) {
      return rateLimitResponse(result);
    }
    return null;
  } catch (err) {
    console.error("[rate-limit] error:", (err as Error).message);
    // Fail closed: if rate limit storage fails, deny to prevent abuse bypass
    return NextResponse.json(
      { success: false, message: "Service temporarily unavailable" },
      { status: 503 }
    );
  }
}

export async function cleanupExpiredRateLimits(): Promise<number> {
  const result = await prisma.rateLimit.deleteMany({
    where: { resetAt: { lt: new Date() } },
  });
  return result.count;
}
