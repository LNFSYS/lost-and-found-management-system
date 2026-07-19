import { createClient } from "redis";

const API_BASE_URL = process.env.E2E_API_URL ?? "http://localhost:3001/api";

interface Envelope<T> {
  success: boolean;
  data?: T;
}

async function main() {
  const readinessResponse = await fetch(`${API_BASE_URL}/health/ready`);
  const readiness = await readinessResponse.json() as Envelope<{
    status: string;
    checks: { redis?: { configured?: boolean; ready?: boolean; mode?: string } };
  }>;
  if (!readinessResponse.ok || readiness.data?.status !== "ready") {
    throw new Error(`Readiness failed with HTTP ${readinessResponse.status}`);
  }
  if (process.env.REDIS_URL && readiness.data.checks.redis?.mode !== "distributed") {
    throw new Error("Redis is configured but readiness did not report distributed mode.");
  }

  const statuses: number[] = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(`${API_BASE_URL}/auth/register/request-otp`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "invalid" })
    });
    statuses.push(response.status);
  }
  if (statuses.at(-1) !== 429) {
    throw new Error(`Expected Redis-backed OTP limiter to return 429 on request 6, got ${statuses.join(", ")}`);
  }

  const metricsResponse = await fetch(`${API_BASE_URL}/metrics`);
  const metrics = await metricsResponse.text();
  if (!metricsResponse.ok) {
    throw new Error(`Metrics endpoint failed with HTTP ${metricsResponse.status}`);
  }
  if (process.env.REDIS_URL && !/lnfs_rate_limit_checks_total\{backend="redis",policy="auth-otp"\} 6/.test(metrics)) {
    throw new Error("Metrics did not prove that the Redis rate-limit backend handled all OTP checks.");
  }
  if (process.env.REDIS_URL && !/lnfs_socket_adapter_initializations_total\{mode="redis"\} 1/.test(metrics)) {
    throw new Error("Metrics did not prove that the Socket.IO Redis adapter initialized.");
  }

  if (process.env.REDIS_URL) {
    const redis = createClient({ url: process.env.REDIS_URL });
    await redis.connect();
    const keys = await redis.keys("lnfs:rate-limit:auth-otp:*");
    if (keys.length > 0) {
      await redis.del(keys);
    }
    await redis.quit();
  }

  console.log("Runtime hardening smoke passed for readiness, distributed limiter, Socket.IO adapter and metrics.");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
