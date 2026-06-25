// Background worker entry point: `npm run worker`.
//
// Registers job processors and schedules the recurring sweeps. With the default
// in-memory driver everything runs in THIS process (no Redis). With
// QUEUE_DRIVER=bullmq the processors attach to Redis-backed queues instead.

// @prisma/client loads .env automatically when the client is instantiated.
import { jobs } from "@/lib/jobs";
import { computeArrears } from "@/lib/jobs/handlers/computeArrears";
import { sendComplianceReminders } from "@/lib/jobs/handlers/sendComplianceReminders";
import { pollBankFeed } from "@/lib/jobs/handlers/pollBankFeed";

async function main() {
  console.log(`[worker] starting (queue driver: ${jobs.driverName})`);

  // Register processors.
  jobs.process("computeArrears", computeArrears);
  jobs.process("sendComplianceReminders", sendComplianceReminders);
  jobs.process("pollBankFeed", pollBankFeed);

  // Schedule recurring sweeps. In-memory uses everyMs; BullMQ uses cron.
  await jobs.schedule("computeArrears", {}, { everyMs: 60_000, cron: "0 * * * *" });
  await jobs.schedule(
    "sendComplianceReminders",
    {},
    { everyMs: 60_000, cron: "0 7 * * *" },
  );
  await jobs.schedule("pollBankFeed", {}, { everyMs: 120_000, cron: "0 * * * *" });

  console.log("[worker] processors registered and sweeps scheduled");
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
