import { adminRepository } from "../repositories/admin.repository.js";
import { dbPool } from "../config/db.js";
import type { PoolConnection, RowDataPacket } from "mysql2/promise";
import { appointmentService } from "./appointment.service.js";
import { metricsService } from "./metrics.service.js";
import { postService } from "./post.service.js";
import { logger } from "../utils/logger.js";

const JOB_INTERVAL_MS = 15 * 60 * 1000;

let started = false;

async function runScheduledJobs() {
  let connection: PoolConnection | null = null;
  try {
    connection = await dbPool.getConnection();
    const [lockRows] = await connection.query<Array<{ acquired: number } & RowDataPacket>>(
      "SELECT GET_LOCK('lnfs:scheduled-jobs:v1', 0) AS acquired"
    );
    if (Number(lockRows[0]?.acquired ?? 0) !== 1) {
      logger.info("scheduled_jobs_skipped", { reason: "lock_not_acquired" });
      metricsService.increment("lnfs_scheduled_jobs_total", { result: "skipped" });
      return;
    }
    const startedAt = Date.now();
    const [posts, warehouse, nearExpiry, capacity, reminders] = await Promise.all([
      postService.expireOverduePosts(),
      adminRepository.expireOverdueWarehouseItems("system"),
      adminRepository.alertWarehouseItemsNearExpiry(7),
      adminRepository.alertWarehouseCapacityIfNeeded(),
      appointmentService.sendReminders(24)
    ]);
    const changed =
      posts.expired > 0 ||
      warehouse.expired > 0 ||
      nearExpiry.alertedItems > 0 ||
      capacity.alerted ||
      reminders.reminded > 0;
    if (changed) {
      logger.info("scheduled_jobs_completed", {
        durationMs: Date.now() - startedAt,
        posts,
        warehouse,
        nearExpiry,
        capacity,
        reminders
      });
    }
    metricsService.increment("lnfs_scheduled_jobs_total", { result: "completed" });
  } catch (error) {
    logger.warn("scheduled_jobs_failed", { error });
    metricsService.increment("lnfs_scheduled_jobs_total", { result: "failed" });
  } finally {
    if (!connection) {
      return;
    }
    try {
      await connection.query("SELECT RELEASE_LOCK('lnfs:scheduled-jobs:v1')");
    } finally {
      connection.release();
    }
  }
}

export function startScheduledJobs() {
  if (started) {
    return;
  }
  started = true;
  setTimeout(() => void runScheduledJobs(), 10_000);
  setInterval(() => void runScheduledJobs(), JOB_INTERVAL_MS);
}
