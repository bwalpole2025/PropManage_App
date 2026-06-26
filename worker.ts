// Background worker entry point: `npm run worker`.
//
// Registers job processors and schedules the recurring sweeps. With the default
// in-memory driver everything runs in THIS process (no Redis). With
// QUEUE_DRIVER=bullmq the processors attach to Redis-backed queues instead.
//
// Cadence note: the day-boundary reminder sweeps (compliance / rent / MTD / bank
// consent) run hourly, not once a day. Each decides *per account* whether to
// deliver — gated on the account-local send hour — and dedups every event, so a
// reminder lands once at the right local time regardless of the worker's wall
// clock or restarts.

// @prisma/client loads .env automatically when the client is instantiated.
import { jobs } from "@/lib/jobs";
import { computeArrears } from "@/lib/jobs/handlers/computeArrears";
import { sendComplianceReminders } from "@/lib/jobs/handlers/sendComplianceReminders";
import { sendRentReminders } from "@/lib/jobs/handlers/sendRentReminders";
import { sendMtdReminders } from "@/lib/jobs/handlers/sendMtdReminders";
import { sendBankConsentWarnings } from "@/lib/jobs/handlers/sendBankConsentWarnings";
import { pollBankFeed } from "@/lib/jobs/handlers/pollBankFeed";

async function main() {
  console.log(`[worker] starting (queue driver: ${jobs.driverName})`);

  // Register processors.
  jobs.process("computeArrears", computeArrears);
  jobs.process("sendComplianceReminders", sendComplianceReminders);
  jobs.process("sendRentReminders", sendRentReminders);
  jobs.process("sendMtdReminders", sendMtdReminders);
  jobs.process("sendBankConsentWarnings", sendBankConsentWarnings);
  jobs.process("pollBankFeed", pollBankFeed);

  // Schedule recurring sweeps. In-memory uses everyMs; BullMQ uses cron.
  // Arrears + bank polling stay frequent; the day-boundary reminder sweeps run
  // hourly and self-gate on each account's local send hour.
  await jobs.schedule("computeArrears", {}, { everyMs: 60_000, cron: "0 * * * *" });
  await jobs.schedule(
    "sendComplianceReminders",
    {},
    { everyMs: 3_600_000, cron: "0 * * * *" },
  );
  await jobs.schedule(
    "sendRentReminders",
    {},
    { everyMs: 3_600_000, cron: "0 * * * *" },
  );
  await jobs.schedule(
    "sendMtdReminders",
    {},
    { everyMs: 3_600_000, cron: "0 * * * *" },
  );
  await jobs.schedule(
    "sendBankConsentWarnings",
    {},
    { everyMs: 3_600_000, cron: "0 * * * *" },
  );
  await jobs.schedule("pollBankFeed", {}, { everyMs: 120_000, cron: "0 * * * *" });

  console.log("[worker] processors registered and sweeps scheduled");
}

main().catch((err) => {
  console.error("[worker] fatal:", err);
  process.exit(1);
});
