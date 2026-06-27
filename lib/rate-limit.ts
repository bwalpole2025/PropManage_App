import "server-only";
import { headers } from "next/headers";

// Lightweight fixed-window rate limiter. Uses Redis (atomic INCR + EXPIRE) when
// REDIS_URL is configured — the only correct option in a multi-instance /
// serverless deploy, where an in-memory counter resets per cold start and per
// instance. Falls back to an in-process Map for local dev / single-process runs.
//
// IMPORTANT: set REDIS_URL in production so limits are enforced globally. The
// in-memory fallback is best-effort only.

interface Bucket {
  count: number;
  resetAt: number;
}

const memory = new Map<string, Bucket>();

let redisClient: import("ioredis").Redis | null | undefined;

async function getRedis(): Promise<import("ioredis").Redis | null> {
  if (redisClient !== undefined) return redisClient;
  const url = process.env.REDIS_URL;
  if (!url) {
    redisClient = null;
    return null;
  }
  try {
    const { default: Redis } = await import("ioredis");
    redisClient = new Redis(url, { maxRetriesPerRequest: 2, enableOfflineQueue: false });
    redisClient.on("error", () => {
      // Swallow connection noise; we degrade to the in-memory path on failure.
    });
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

export interface RateLimitResult {
  /** True when this request is within the allowed window budget. */
  ok: boolean;
  remaining: number;
  /** Seconds until the window resets (use for a Retry-After hint). */
  retryAfterSec: number;
}

/**
 * Count one hit against `key` and report whether it is within `limit` per
 * `windowSec`. Fails OPEN (allows the request) only if both Redis and the
 * in-memory path error — never throws into the caller.
 */
export async function rateLimit(
  key: string,
  limit: number,
  windowSec: number,
): Promise<RateLimitResult> {
  const redis = await getRedis();
  if (redis) {
    try {
      const redisKey = `rl:${key}`;
      const count = await redis.incr(redisKey);
      if (count === 1) await redis.expire(redisKey, windowSec);
      let ttl = await redis.ttl(redisKey);
      if (ttl < 0) ttl = windowSec;
      return {
        ok: count <= limit,
        remaining: Math.max(0, limit - count),
        retryAfterSec: ttl,
      };
    } catch {
      // fall through to the in-memory limiter
    }
  }

  const now = Date.now();
  const bucket = memory.get(key);
  if (!bucket || bucket.resetAt <= now) {
    memory.set(key, { count: 1, resetAt: now + windowSec * 1000 });
    return { ok: true, remaining: limit - 1, retryAfterSec: windowSec };
  }
  bucket.count += 1;
  return {
    ok: bucket.count <= limit,
    remaining: Math.max(0, limit - bucket.count),
    retryAfterSec: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/** Best-effort client IP from the proxy headers (Vercel sets x-forwarded-for). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return h.get("x-real-ip") ?? "unknown";
}

/**
 * Convenience guard: enforce a limit and return a human message when exceeded,
 * or null when the request may proceed.
 */
export async function enforceRateLimit(
  key: string,
  limit: number,
  windowSec: number,
  message = "Too many attempts. Please wait a moment and try again.",
): Promise<string | null> {
  const res = await rateLimit(key, limit, windowSec);
  if (res.ok) return null;
  const mins = Math.ceil(res.retryAfterSec / 60);
  return mins > 1 ? `${message} (try again in ~${mins} minutes)` : message;
}
