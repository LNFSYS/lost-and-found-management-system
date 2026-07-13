import { matchingJobRepository } from "../repositories/matching-job.repository.js";
import { matchingService } from "./matching.service.js";

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
        console.info("[matching-worker] completed", {
          postId: job.postId,
          matches: matches.length,
          attempt: job.attempt
        });
      } catch (error) {
        await matchingJobRepository.fail(job.postId, job.attempt, error);
        console.warn("[matching-worker] failed", {
          postId: job.postId,
          attempt: job.attempt,
          error: error instanceof Error ? error.message : "unknown error"
        });
      }
    }
    if (jobs.length > 0) {
      console.info("[matching-worker] batch completed", { jobs: jobs.length, durationMs: Date.now() - startedAt });
    }
  } catch (error) {
    console.warn(`[matching-worker] batch failed: ${error instanceof Error ? error.message : "unknown error"}`);
  } finally {
    processing = false;
  }
}

export const matchingWorkerService = {
  async enqueue(postId: string) {
    try {
      await matchingJobRepository.enqueue(postId);
      return true;
    } catch (error) {
      console.warn("[matching-worker] enqueue failed; using in-process fallback", {
        postId,
        error: error instanceof Error ? error.message : "unknown error"
      });
      void matchingService.runForPost(postId).catch((fallbackError: unknown) => {
        console.warn("[matching-worker] in-process fallback failed", {
          postId,
          error: fallbackError instanceof Error ? fallbackError.message : "unknown error"
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
