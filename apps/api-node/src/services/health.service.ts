import { dbPool } from "../config/db.js";
import { env } from "../config/env.js";
import { redisHealth, redisRequired } from "../config/redis.js";
import { matchingJobRepository } from "../repositories/matching-job.repository.js";

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error(`Dependency check timed out after ${timeoutMs} ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

function dependencyError(error: unknown, fallback: string) {
  return env.nodeEnv === "development" && error instanceof Error ? error.message : fallback;
}

export const healthService = {
  liveness() {
    return {
      status: "ok" as const,
      service: "lnfs-api-node",
      uptimeSeconds: Math.floor(process.uptime()),
      timestamp: new Date().toISOString()
    };
  },

  async readiness() {
    const startedAt = Date.now();
    const checks: Record<string, unknown> = {};
    let ready = true;

    try {
      await withTimeout(dbPool.query("SELECT 1"), env.healthCheckTimeoutMs);
      checks.database = { status: "ok" };
    } catch (error) {
      ready = false;
      checks.database = { status: "error", message: dependencyError(error, "Database unavailable") };
    }

    try {
      checks.matchingQueue = {
        status: "ok",
        ...await withTimeout(matchingJobRepository.getOperationalStats(), env.healthCheckTimeoutMs)
      };
    } catch (error) {
      ready = false;
      checks.matchingQueue = {
        status: "error",
        message: dependencyError(error, "Matching queue unavailable")
      };
    }

    const redis = redisHealth();
    checks.redis = redis;
    if (redisRequired() && !redis.ready) {
      ready = false;
    }

    return {
      status: ready ? "ready" as const : "not_ready" as const,
      service: "lnfs-api-node",
      durationMs: Date.now() - startedAt,
      checks
    };
  }
};
