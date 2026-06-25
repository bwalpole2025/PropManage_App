// Env-based job-queue factory. Defaults to the in-memory driver so the app and
// worker run with NO Redis. Set QUEUE_DRIVER=bullmq + REDIS_URL for real queues.

import { InMemoryQueue } from "./inMemory";
import { BullMQQueue } from "./bullmq";
import type { JobQueue } from "./types";

function makeQueue(): JobQueue {
  const driver = process.env.QUEUE_DRIVER ?? "memory";
  if (driver === "bullmq" && process.env.REDIS_URL) return new BullMQQueue();
  return new InMemoryQueue();
}

export const jobs: JobQueue = makeQueue();

export type { JobName, JobPayloads, JobQueue } from "./types";
