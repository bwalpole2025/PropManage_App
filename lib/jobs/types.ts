// Background job queue abstraction. Default driver is in-memory (no Redis);
// BullMQ is selected via QUEUE_DRIVER=bullmq + REDIS_URL.

export type JobName =
  | "computeArrears"
  | "sendComplianceReminders"
  | "pollBankFeed";

// entityId omitted ⇒ the handler sweeps all accounts.
export interface JobPayloads {
  computeArrears: { entityId?: string };
  sendComplianceReminders: { entityId?: string };
  pollBankFeed: { entityId?: string };
}

export interface ScheduleOptions {
  /** In-memory driver: run every N ms. */
  everyMs?: number;
  /** BullMQ driver: cron pattern for a repeatable job. */
  cron?: string;
}

export type JobHandler<N extends JobName> = (
  data: JobPayloads[N],
) => Promise<void>;

export interface JobQueue {
  readonly driverName: string;
  enqueue<N extends JobName>(name: N, data: JobPayloads[N]): Promise<void>;
  schedule<N extends JobName>(
    name: N,
    data: JobPayloads[N],
    opts: ScheduleOptions,
  ): Promise<void>;
  process<N extends JobName>(name: N, handler: JobHandler<N>): void;
}
