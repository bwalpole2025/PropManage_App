// Central notification dispatcher (server-only — imports prisma + senders).
//
// Every scheduled reminder fans out through here. Given a logical event it:
//   1. (optionally) claims a stable `dedupKey` so a recurring sweep delivers the
//      event at most once, ever — the NotificationDispatch ledger is the source
//      of truth for "has this already fired?";
//   2. resolves the enabled channels from the account's preferences
//      (`resolveDeliveryChannels` — the intersection of category × channel);
//   3. delivers to each enabled channel exactly once per recipient (in-app row,
//      email), recipients being principal ∪ ACTIVE members.
//
// This is what makes the acceptance criterion hold: a single event yields one
// in-app + one email (for the configured channels), and disabling a channel or
// its category removes that delivery.

import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { emailSender } from "@/lib/email";
import { MembershipStatus } from "@/lib/enums";
import {
  NotificationChannel,
  type NotificationCategory,
  parseNotificationPrefs,
  resolveDeliveryChannels,
} from "./index";
import { createNotification } from "./service";

export interface NotifyEvent {
  accountId: string;
  category: NotificationCategory;
  /** NotificationKind — the in-app row's kind. */
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
  /** Email subject; defaults to "<title> — PropManage". */
  emailSubject?: string;
  /**
   * Stable per-logical-event key. When set the event is delivered at most once
   * (claimed in the NotificationDispatch ledger). Omit for events that should
   * fire on every call.
   */
  dedupKey?: string;
  /**
   * When present, the email channel renders the richer, structured compliance
   * template (property / item / deadline / penalty + RAG accent) instead of the
   * generic operational alert. The in-app row still uses `title`/`body`.
   */
  compliance?: {
    tierLabel: string;
    rag: "RED" | "AMBER" | "GREEN";
    itemLabel: string;
    propertyLabel: string;
    deadlineText: string;
    penalty: string;
  };
  /**
   * When present, the email channel renders the structured report digest (a
   * period heading + metrics table + notes) instead of the generic operational
   * alert. The in-app row still uses `title`/`body`.
   */
  report?: {
    heading: string;
    periodLabel: string;
    intro?: string;
    metrics: { label: string; value: string }[];
    notes?: string[];
  };
}

export interface DispatchResult {
  /** false only when a prior dispatch already claimed the dedup key. */
  delivered: boolean;
  channels: NotificationChannel[];
  inApp: number;
  email: number;
}

const SKIPPED: DispatchResult = {
  delivered: false,
  channels: [],
  inApp: 0,
  email: 0,
};

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}

interface Recipient {
  userId: string;
  email: string | null;
  firstName: string | null;
}

const recipientSelect = {
  id: true,
  email: true,
  firstName: true,
} as const;

function toRecipient(u: {
  id: string;
  email: string | null;
  firstName: string | null;
}): Recipient {
  return {
    userId: u.id,
    email: u.email,
    firstName: u.firstName,
  };
}

/** Principal ∪ ACTIVE members, deduped by user id, with contact details. */
async function loadRecipients(accountId: string): Promise<Recipient[]> {
  const [account, members] = await Promise.all([
    prisma.account.findUnique({
      where: { id: accountId },
      select: { principal: { select: recipientSelect } },
    }),
    prisma.membership.findMany({
      where: { accountId, status: MembershipStatus.ACTIVE },
      select: { user: { select: recipientSelect } },
    }),
  ]);

  const byId = new Map<string, Recipient>();
  if (account?.principal) byId.set(account.principal.id, toRecipient(account.principal));
  for (const m of members) byId.set(m.user.id, toRecipient(m.user));
  return [...byId.values()];
}

/**
 * Dispatch one notification to every enabled channel, once. Returns which
 * channels fired (and per-channel send counts). When a `dedupKey` is supplied
 * and was already claimed, returns `{ delivered: false }` and does nothing.
 */
export async function dispatchNotification(
  event: NotifyEvent,
): Promise<DispatchResult> {
  // 1. Claim the dedup key up front. If it already exists this event has fired
  //    before (or its suppression was already recorded) — nothing more to do.
  if (event.dedupKey) {
    try {
      await prisma.notificationDispatch.create({
        data: {
          accountId: event.accountId,
          dedupKey: event.dedupKey,
          category: event.category,
          channels: "",
        },
      });
    } catch (e) {
      if (isUniqueViolation(e)) return SKIPPED;
      throw e;
    }
  }

  // 2. Resolve the enabled channels from the account's preferences.
  const account = await prisma.account.findUnique({
    where: { id: event.accountId },
    select: { notificationPrefs: true },
  });
  const prefs = parseNotificationPrefs(account?.notificationPrefs);
  const channels = resolveDeliveryChannels(prefs, event.category);

  // Category (or all channels) disabled → suppressed. The dedup row already
  // records this as handled so we never retry it.
  if (channels.length === 0) {
    return { delivered: true, channels: [], inApp: 0, email: 0 };
  }

  const recipients = await loadRecipients(event.accountId);
  const emailSubject = event.emailSubject ?? `${event.title} — PropManage`;
  const emailBody = event.body ?? event.title;

  let inApp = 0;
  let email = 0;

  if (channels.includes(NotificationChannel.inApp)) {
    if (recipients.length === 0) {
      // No resolvable users — fall back to a single account-wide row.
      await createNotification({
        accountId: event.accountId,
        userId: null,
        kind: event.kind,
        title: event.title,
        body: event.body ?? null,
        href: event.href ?? null,
      });
      inApp = 1;
    } else {
      await prisma.notification.createMany({
        data: recipients.map((r) => ({
          accountId: event.accountId,
          userId: r.userId,
          kind: event.kind,
          title: event.title,
          body: event.body ?? null,
          href: event.href ?? null,
        })),
      });
      inApp = recipients.length;
    }
  }

  if (channels.includes(NotificationChannel.email)) {
    for (const r of recipients) {
      if (!r.email) continue;
      if (event.report) {
        await emailSender.sendReport({
          to: r.email,
          name: r.firstName,
          subject: emailSubject,
          href: event.href ?? null,
          ...event.report,
        });
      } else if (event.compliance) {
        await emailSender.sendComplianceAlert({
          to: r.email,
          name: r.firstName,
          subject: emailSubject,
          href: event.href ?? null,
          ...event.compliance,
        });
      } else {
        await emailSender.sendOperationalAlert({
          to: r.email,
          name: r.firstName,
          subject: emailSubject,
          heading: event.title,
          body: emailBody,
          href: event.href ?? null,
        });
      }
      email++;
    }
  }

  // 3. Record the channels actually delivered (observability).
  if (event.dedupKey) {
    await prisma.notificationDispatch.update({
      where: {
        accountId_dedupKey: {
          accountId: event.accountId,
          dedupKey: event.dedupKey,
        },
      },
      data: { channels: channels.join(",") },
    });
  }

  return { delivered: true, channels, inApp, email };
}
