import { prisma } from "@/lib/db";
import {
  MembershipStatus,
  ReminderState,
  RentStatus,
  TenancyStatus,
  resolveDocumentCategoryLabel,
} from "@/lib/enums";
import { getCustomCategoryNames } from "@/services/documents";
import { todayKeyInTz, type CalendarEvent } from "@/lib/calendar";

const DAY_MS = 86_400_000;
// Generous window so the month grid's leading/trailing days are always covered;
// the client buckets precisely by the account time zone.
const WINDOW_DAYS = 45;

/**
 * All time-based events for the calendar, within a window around the focused
 * date. Sources: rent schedule (Upcoming Payments, per tenant), documents with
 * expiry dates, OPEN reminders, and account events (verification / reset).
 * Returns the account time zone so the client can do tz-correct date math.
 */
export async function getCalendarData(
  entityId: string,
  requestedDateKey?: string,
): Promise<{ events: CalendarEvent[]; timeZone: string; focusedKey: string }> {
  const account = await prisma.account.findUnique({
    where: { id: entityId },
    select: { timeZone: true, principalUserId: true },
  });
  const timeZone = account?.timeZone || "Europe/London";
  const focusedKey = requestedDateKey || todayKeyInTz(timeZone);

  const [y, m, d] = focusedKey.split("-").map(Number);
  const anchorMs = Date.UTC(y, m - 1, d, 12);
  const from = new Date(anchorMs - WINDOW_DAYS * DAY_MS);
  const to = new Date(anchorMs + WINDOW_DAYS * DAY_MS);

  const members = await prisma.membership.findMany({
    where: { accountId: entityId, status: MembershipStatus.ACTIVE },
    select: { userId: true },
  });
  const userIds = Array.from(
    new Set(
      [account?.principalUserId, ...members.map((mm) => mm.userId)].filter(
        Boolean,
      ),
    ),
  ) as string[];

  const [rent, docs, reminders, customNames, emailTokens, resetTokens] =
    await Promise.all([
      prisma.rentScheduleEntry.findMany({
        where: {
          dueDate: { gte: from, lte: to },
          status: {
            in: [RentStatus.DUE, RentStatus.PARTIAL, RentStatus.OVERDUE],
          },
          tenancy: {
            status: TenancyStatus.ACTIVE,
            property: { accountId: entityId },
          },
        },
        select: {
          id: true,
          dueDate: true,
          expectedPence: true,
          tenancy: {
            select: {
              property: { select: { id: true, addressLine1: true } },
              tenants: {
                where: { isLeadTenant: true },
                take: 1,
                select: { name: true },
              },
            },
          },
        },
        orderBy: { dueDate: "asc" },
        take: 500,
      }),
      prisma.document.findMany({
        where: { accountId: entityId, expiryDate: { gte: from, lte: to } },
        select: {
          id: true,
          category: true,
          expiryDate: true,
          property: { select: { addressLine1: true } },
        },
        orderBy: { expiryDate: "asc" },
        take: 500,
      }),
      prisma.reminder.findMany({
        where: {
          accountId: entityId,
          status: ReminderState.OPEN,
          dueDate: { gte: from, lte: to },
        },
        select: { id: true, name: true, description: true, dueDate: true },
        orderBy: { dueDate: "asc" },
        take: 500,
      }),
      getCustomCategoryNames(entityId),
      userIds.length
        ? prisma.emailVerificationToken.findMany({
            where: {
              userId: { in: userIds },
              usedAt: null,
              createdAt: { gte: from, lte: to },
            },
            select: { id: true, createdAt: true },
          })
        : Promise.resolve([] as { id: string; createdAt: Date }[]),
      userIds.length
        ? prisma.passwordResetToken.findMany({
            where: {
              userId: { in: userIds },
              usedAt: null,
              createdAt: { gte: from, lte: to },
            },
            select: { id: true, createdAt: true },
          })
        : Promise.resolve([] as { id: string; createdAt: Date }[]),
    ]);

  const events: CalendarEvent[] = [];

  for (const e of rent) {
    const name = e.tenancy.tenants[0]?.name ?? "Tenant";
    events.push({
      id: `rent-${e.id}`,
      type: "payment",
      date: e.dueDate.toISOString(),
      title: `Rent — ${name}`,
      subtitle: e.tenancy.property.addressLine1,
      amountPence: e.expectedPence,
      href: `/properties/${e.tenancy.property.id}/tenancies`,
    });
  }
  for (const doc of docs) {
    if (!doc.expiryDate) continue;
    events.push({
      id: `doc-${doc.id}`,
      type: "expiry",
      date: doc.expiryDate.toISOString(),
      title: `${resolveDocumentCategoryLabel(doc.category, customNames)} expires`,
      subtitle: doc.property?.addressLine1 ?? "Portfolio-wide",
      href: "/files/documents",
    });
  }
  for (const r of reminders) {
    events.push({
      id: `rem-${r.id}`,
      type: "reminder",
      date: r.dueDate.toISOString(),
      title: r.name,
      subtitle: r.description,
      href: "/files/reminders",
    });
  }
  for (const t of emailTokens) {
    events.push({
      id: `ev-${t.id}`,
      type: "account",
      date: t.createdAt.toISOString(),
      title: "Email verification requested",
      href: "/settings/security",
    });
  }
  for (const t of resetTokens) {
    events.push({
      id: `pr-${t.id}`,
      type: "account",
      date: t.createdAt.toISOString(),
      title: "Password reset requested",
      href: "/settings/security",
    });
  }

  return { events, timeZone, focusedKey };
}
