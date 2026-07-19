import fs from "node:fs/promises";

const apiBaseUrl = (process.env.PERF_API_URL ?? "http://localhost:3001/api").replace(/\/$/, "");
const totalRequests = numberFromEnv("PERF_REQUESTS", 120);
const concurrency = numberFromEnv("PERF_CONCURRENCY", 10);
const p95LimitMs = numberFromEnv("PERF_P95_LIMIT_MS", 1_000);
const maxErrorRate = numberFromEnv("PERF_MAX_ERROR_RATE", 0.01);
const outputPath = process.env.PERF_OUTPUT_PATH;
const defaultPaths = ["/health", `/posts${String.fromCharCode(63)}page=1&pageSize=12`];
const paths = process.env.PERF_PATHS
  ? process.env.PERF_PATHS.split(",").map((value) => value.trim()).filter(Boolean)
  : defaultPaths;

function numberFromEnv(name: string, fallback: number) {
  const value = process.env[name];
  const parsed = value ? Number(value) : fallback;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
  return parsed;
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) {
    return 0;
  }
  const index = Math.min(values.length - 1, Math.ceil(values.length * ratio) - 1);
  return values[index];
}

async function timedRequest(path: string) {
  const startedAt = performance.now();
  try {
    const response = await fetch(`${apiBaseUrl}${path}`, {
      headers: { Accept: "application/json", "X-Performance-Smoke": "true" }
    });
    await response.arrayBuffer();
    return { durationMs: performance.now() - startedAt, ok: response.ok, status: response.status, path };
  } catch {
    return { durationMs: performance.now() - startedAt, ok: false, status: 0, path };
  }
}

async function main() {
  for (const path of paths) {
    await timedRequest(path);
  }

  let cursor = 0;
  const results: Awaited<ReturnType<typeof timedRequest>>[] = [];
  await Promise.all(Array.from({ length: concurrency }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= totalRequests) {
        return;
      }
      results.push(await timedRequest(paths[index % paths.length]));
    }
  }));

  const durations = results.map((result) => result.durationMs).sort((left, right) => left - right);
  const errors = results.filter((result) => !result.ok);
  const report = {
    generatedAt: new Date().toISOString(),
    apiBaseUrl,
    requests: results.length,
    concurrency,
    paths,
    latencyMs: {
      min: Number((durations[0] ?? 0).toFixed(2)),
      p50: Number(percentile(durations, 0.5).toFixed(2)),
      p95: Number(percentile(durations, 0.95).toFixed(2)),
      p99: Number(percentile(durations, 0.99).toFixed(2)),
      max: Number((durations.at(-1) ?? 0).toFixed(2))
    },
    errors: errors.length,
    errorRate: Number((errors.length / Math.max(results.length, 1)).toFixed(4)),
    thresholds: { p95LimitMs, maxErrorRate },
    passed: percentile(durations, 0.95) <= p95LimitMs && errors.length / Math.max(results.length, 1) <= maxErrorRate
  };

  console.log(JSON.stringify(report, null, 2));
  if (outputPath) {
    await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }
  if (!report.passed) {
    throw new Error(`Performance smoke failed: p95=${report.latencyMs.p95}ms, errorRate=${report.errorRate}`);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
