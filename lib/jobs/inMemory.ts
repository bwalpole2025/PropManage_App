import type {
  JobHandler,
  JobName,
  JobPayloads,
  JobQueue,
  ScheduleOptions,
} from "./types";

/**
 * In-process queue (default). Runs jobs inline in the SAME process that
 * registered the processor — so processors must be registered (i.e. `npm run
 * worker`) for enqueued/scheduled jobs to execute. The web process enqueueing
 * with this driver is best-effort (no processor → logged + skipped). Use the
 * BullMQ driver for real cross-process delivery.
 */
export class InMemoryQueue implements JobQueue {
  readonly driverName = "memory";
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private handlers = new Map<JobName, JobHandler<any>>();
  private timers: ReturnType<typeof setInterval>[] = [];

  process<N extends JobName>(name: N, handler: JobHandler<N>): void {
    this.handlers.set(name, handler);
  }

  private async run<N extends JobName>(name: N, data: JobPayloads[N]) {
    const handler = this.handlers.get(name);
    if (!handler) {
      console.warn(`[jobs:memory] no processor for "${name}" — skipped`);
      return;
    }
    try {
      await handler(data);
    } catch (err) {
      console.error(`[jobs:memory] "${name}" failed:`, err);
    }
  }

  async enqueue<N extends JobName>(name: N, data: JobPayloads[N]) {
    await this.run(name, data);
  }

  async schedule<N extends JobName>(
    name: N,
    data: JobPayloads[N],
    opts: ScheduleOptions,
  ) {
    const everyMs = opts.everyMs ?? 60_000;
    // Run once on registration, then on an interval.
    await this.run(name, data);
    const timer = setInterval(() => void this.run(name, data), everyMs);
    this.timers.push(timer);
  }

  /** Stop all scheduled timers (used in tests / graceful shutdown). */
  stop() {
    this.timers.forEach(clearInterval);
    this.timers = [];
  }
}
