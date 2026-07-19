import { createApp } from "./app.js";
import { checkDatabaseConnection, dbPool } from "./config/db.js";
import { env } from "./config/env.js";
import { closeRedisConnections, connectSharedRedis, redisConfigured } from "./config/redis.js";
import { closeRealtimeServer, setupRealtimeServer } from "./services/realtime.service.js";
import { startScheduledJobs } from "./services/scheduled-jobs.service.js";
import { startMatchingWorker } from "./services/matching-worker.service.js";
import { metricsService } from "./services/metrics.service.js";
import { createServer } from "node:http";
import { logger } from "./utils/logger.js";

async function startServer() {
  await checkDatabaseConnection();
  let redisMode = "local-fallback";
  if (redisConfigured()) {
    const redis = await connectSharedRedis();
    redisMode = redis ? "distributed" : "local-fallback";
  }
  metricsService.setGauge("lnfs_redis_ready", redisMode === "distributed" ? 1 : 0);

  const app = createApp();
  const server = createServer(app);
  await setupRealtimeServer(server);
  startScheduledJobs();
  startMatchingWorker();

  server.listen(env.port, () => {
    logger.info("api_started", {
      port: env.port,
      environment: env.nodeEnv,
      redis: redisMode
    });
  });

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) {
      return;
    }
    shuttingDown = true;
    logger.info("api_shutdown_started", { signal });
    const forceExit = setTimeout(() => {
      logger.error("api_shutdown_timeout", { timeoutMs: env.shutdownTimeoutMs });
      process.exit(1);
    }, env.shutdownTimeoutMs);
    forceExit.unref();

    await closeRealtimeServer();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await Promise.all([dbPool.end(), closeRedisConnections()]);
    clearTimeout(forceExit);
    logger.info("api_shutdown_completed", { signal });
    process.exit(0);
  };

  process.once("SIGTERM", () => void shutdown("SIGTERM"));
  process.once("SIGINT", () => void shutdown("SIGINT"));
}

startServer().catch((error: unknown) => {
  logger.error("api_start_failed", { error });
  process.exit(1);
});
