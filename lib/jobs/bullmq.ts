import type {
  JobHandler,
  JobName,
  JobPayloads,
  JobQueue,
  ScheduleOptions,
} from "./types";

/**
 * BullMQ-backed queue (QUEUE_DRIVER=bullmq + REDIS_URL). bullmq/ioredis are
 * imported lazily so the default in-memory path never loads them.
 */
export class BullMQQueue implements JobQueue {
  readonly driverName = "bullmq";
  private url = process.env.REDIS_URL as string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private connection: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private queues = new Map<JobName, any>();

  private async getConnection() {
    if (!this.connection) {
      const { default: IORedis } = await import("ioredis");
      this.connection = new IORedis(this.url, { maxRetriesPerRequest: null });
    }
    return this.connection;
  }

  private async getQueue(name: JobName) {
    if (!this.queues.has(name)) {
      const { Queue } = await import("bullmq");
      this.queues.set(
        name,
        new Queue(name, { connection: await this.getConnection() }),
      );
    }
    return this.queues.get(name);
  }

  async enqueue<N extends JobName>(name: N, data: JobPayloads[N]) {
    const queue = await this.getQueue(name);
    await queue.add(name, data);
  }

  async schedule<N extends JobName>(
    name: N,
    data: JobPayloads[N],
    opts: ScheduleOptions,
  ) {
    const queue = await this.getQueue(name);
    await queue.add(name, data, {
      repeat: opts.cron
        ? { pattern: opts.cron }
        : { every: opts.everyMs ?? 60_000 },
    });
  }

  process<N extends JobName>(name: N, handler: JobHandler<N>): void {
    // Worker creation is async; fire-and-register.
    void (async () => {
      const { Worker } = await import("bullmq");
      new Worker(name, async (job) => handler(job.data), {
        connection: await this.getConnection(),
      });
    })();
  }
}
