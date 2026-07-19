import { matchingJobRepository } from "../repositories/matching-job.repository.js";
import { logger } from "../utils/logger.js";
import { matchingService } from "./matching.service.js";
import { metricsService } from "./metrics.service.js";

const WORKER_INTERVAL_MS = 5_000;
let started = false;
let processing = false;

async function processMatchingJobs() {
  if (processing) {
    return;
  }
  processing = true;
  const startedAt = Date.now();
  try {
    const jobs = await matchingJobRepository.claimBatch(5);
    for (const job of jobs) {
      try {
        const matches = await matchingService.runForPost(job.postId);
        await matchingJobRepository.complete(job.postId, job.requestedVersion);
        logger.info("matching_job_completed", {
          postId: job.postId,
          matches: matches.length,
          attempt: job.attempt,
          durationMs: Date.now() - startedAt
        });
        metricsService.increment("lnfs_matching_jobs_total", { result: "completed" });
      } catch (error) {
        await matchingJobRepository.fail(job.postId, job.attempt, error);
        logger.warn("matching_job_failed", {
          postId: job.postId,
          attempt: job.attempt,
          error
        });
        metricsService.increment("lnfs_matching_jobs_total", { result: "failed" });
      }
    }
    if (jobs.length > 0) {
      logger.info("matching_batch_completed", { jobs: jobs.length, durationMs: Date.now() - startedAt });
      metricsService.increment("lnfs_matching_batches_total");
    }
    const queue = await matchingJobRepository.getOperationalStats();
    metricsService.setGauge("lnfs_matching_queue_pending", queue.pending);
    metricsService.setGauge("lnfs_matching_queue_processing", queue.processing);
    metricsService.setGauge("lnfs_matching_queue_failed", queue.failed);
    metricsService.setGauge("lnfs_matching_queue_oldest_wait_seconds", queue.oldestWaitSeconds);
  } catch (error) {
    logger.warn("matching_batch_failed", { error });
    metricsService.increment("lnfs_matching_batches_failed_total");
  } finally {
    processing = false;
  }
}

export const matchingWorkerService = {
  async enqueue(postId: string) {
    try {
      await matchingJobRepository.enqueue(postId);
      metricsService.increment("lnfs_matching_jobs_enqueued_total");
      return true;
    } catch (error) {
      logger.warn("matching_enqueue_fallback", {
        postId,
        error
      });
      metricsService.increment("lnfs_matching_enqueue_fallback_total");
      void matchingService.runForPost(postId).catch((fallbackError: unknown) => {
        logger.warn("matching_fallback_failed", {
          postId,
          error: fallbackError
        });
      });
      return false;
    }
  }
};

export function startMatchingWorker() {
  if (started) {
    return;
  }
  started = true;
  setTimeout(() => void processMatchingJobs(), 2_000);
  setInterval(() => void processMatchingJobs(), WORKER_INTERVAL_MS);
}
