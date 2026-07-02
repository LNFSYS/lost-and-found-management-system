import type { NextFunction, Request, Response } from "express";
import { HttpError } from "../utils/http-error.js";

interface Bucket {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs: number;
  max: number;
  keyPrefix: string;
}

const buckets = new Map<string, Bucket>();

function clientKey(request: Request, keyPrefix: string) {
  return `${keyPrefix}:${request.ip ?? request.socket.remoteAddress ?? "unknown"}`;
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

export function rateLimit(options: RateLimitOptions) {
  return (request: Request, response: Response, next: NextFunction) => {
    const now = Date.now();
    pruneExpiredBuckets(now);

    const key = clientKey(request, options.keyPrefix);
    const current = buckets.get(key);
    const bucket = current && current.resetAt > now ? current : { count: 0, resetAt: now + options.windowMs };
    bucket.count += 1;
    buckets.set(key, bucket);

    response.setHeader("X-RateLimit-Limit", String(options.max));
    response.setHeader("X-RateLimit-Remaining", String(Math.max(options.max - bucket.count, 0)));
    response.setHeader("X-RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));

    if (bucket.count > options.max) {
      next(new HttpError(429, "Too many requests. Please try again later."));
      return;
    }

    next();
  };
}

