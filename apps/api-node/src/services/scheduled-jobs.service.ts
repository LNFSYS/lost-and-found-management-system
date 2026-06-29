import { adminRepository } from "../repositories/admin.repository.js";
import { appointmentService } from "./appointment.service.js";
import { postService } from "./post.service.js";

const JOB_INTERVAL_MS = 15 * 60 * 1000;

let started = false;

async function runScheduledJobs() {
  try {
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
      console.info("[jobs] completed", { posts, warehouse, nearExpiry, capacity, reminders });
    }
  } catch (error) {
    console.warn(`[jobs] failed: ${error instanceof Error ? error.message : "unknown error"}`);
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
