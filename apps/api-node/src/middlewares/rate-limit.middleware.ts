import type { NextFunction, Request, Response } from "express";
import { getSharedRedis } from "../config/redis.js";
import { metricsService } from "../services/metrics.service.js";
import { HttpError } from "../utils/http-error.js";
import { logger } from "../utils/logger.js";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
  key?: (request: Request) => string;
}

const buckets = new Map<string, Bucket>();
const redisScript = `
  local count = redis.call('INCR', KEYS[1])
  if count == 1 then
    redis.call('PEXPIRE', KEYS[1], ARGV[1])
  end
  return {count, redis.call('PTTL', KEYS[1])}
`;

function clientKey(request: Request, options: RateLimitOptions) {
  const identifier = options.key?.(request) ?? request.ip ?? request.socket.remoteAddress ?? "unknown";
  return `${options.keyPrefix}:${identifier}`;
}

function pruneExpiredBuckets(now: number) {
  if (buckets.size < 1000) {
    return;
  }
  for (const [key, bucket] of buckets.entries()) {
    if (bucket.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

export function consumeLocalRateLimit(key: string, windowMs: number, now = Date.now()) {
  pruneExpiredBuckets(now);
  const current = buckets.get(key);
  const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + windowMs };
  bucket.count += 1;
  buckets.set(key, bucket);
  return { count: bucket.count, resetAt: bucket.resetAt, backend: "local" as const };
}

export function resetLocalRateLimitsForTest() {
  buckets.clear();
}

async function consumeRateLimit(key: string, windowMs: number) {
  const redis = getSharedRedis();
  if (!redis) {
    return consumeLocalRateLimit(key, windowMs);
  }
  try {
    const result = await redis.eval(redisScript, {
      keys: [`lnfs:rate-limit:${key}`],
      arguments: [String(windowMs)]
    }) as [number, number];
    const count = Number(result[0]);
    const ttlMs = Math.max(Number(result[1]), 0);
    return { count, resetAt: Date.now() + ttlMs, backend: "redis" as const };
  } catch (error) {
    logger.warn("rate_limit_redis_fallback", { keyPrefix: key.split(":")[0], error });
    metricsService.increment("lnfs_rate_limit_backend_fallback_total");
    return consumeLocalRateLimit(key, windowMs);
  }
}

export function rateLimit(options: RateLimitOptions) {
  return async (request: Request, response: Response, next: NextFunction) => {
    const key = clientKey(request, options);
    const bucket = await consumeRateLimit(key, options.windowMs);
    const remaining = Math.max(options.max - bucket.count, 0);

    response.setHeader("X-RateLimit-Limit", String(options.max));
    response.setHeader("X-RateLimit-Remaining", String(remaining));
    response.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    response.setHeader("X-RateLimit-Policy", `${options.max};w=${Math.ceil(options.windowMs / 1000)}`);
    metricsService.increment("lnfs_rate_limit_checks_total", { backend: bucket.backend, policy: options.keyPrefix });

    if (bucket.count > options.max) {
      response.setHeader("Retry-After", String(Math.max(1, Math.ceil((bucket.resetAt - Date.now()) / 1000))));
      metricsService.increment("lnfs_rate_limit_rejections_total", { policy: options.keyPrefix });
      next(new HttpError(429, "Too many requests. Please try again later."));
      return;
    }

    next();
  };
}
