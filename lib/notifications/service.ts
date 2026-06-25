// In-app notification inbox service (server-only — imports prisma).
// Notifications are account-scoped and optionally targeted at a user; a row with
// userId = null is account-wide and shown to everyone in the account.

import { prisma } from "@/lib/db";
import { formatPence } from "@/lib/format";
import { NotificationKind } from "@/lib/enums";

/** Recipient user ids for an account = principal ∪ ACTIVE members (deduped). Pure. */
export function recipientIds(
  principalUserId: string | null | undefined,
  memberUserIds: string[],
): string[] {
  const ids = new Set<string>();
  if (principalUserId) ids.add(principalUserId);
  for (const id of memberUserIds) ids.add(id);
  return [...ids];
}

export async function createNotification(input: {
  accountId: string;
  userId?: string | null;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
}) {
  return prisma.notification.create({
    data: {
      accountId: input.accountId,
      userId: input.userId ?? null,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    },
  });
}

/** Create one notification per recipient (principal + ACTIVE members). Returns the count. */
export async function createForAccountUsers(input: {
  accountId: string;
  kind: string;
  title: string;
  body?: string | null;
  href?: string | null;
}): Promise<number> {
  const [account, members] = await Promise.all([
    prisma.account.findUnique({
      where: { id: input.accountId },
      select: { principalUserId: true },
    }),
    prisma.membership.findMany({
      where: { accountId: input.accountId, status: "ACTIVE" },
      select: { userId: true },
    }),
  ]);
  const userIds = recipientIds(
    account?.principalUserId,
    members.map((m) => m.userId),
  );
  if (userIds.length === 0) {
    await createNotification({ ...input, userId: null });
    return 1;
  }
  await prisma.notification.createMany({
    data: userIds.map((userId) => ({
      accountId: input.accountId,
      userId,
      kind: input.kind,
      title: input.title,
      body: input.body ?? null,
      href: input.href ?? null,
    })),
  });
  return userIds.length;
}

export async function createPaymentReceivedNotifications(
  accountId: string,
  payment: { amountPence: number; description: string },
): Promise<number> {
  return createForAccountUsers({
    accountId,
    kind: NotificationKind.PAYMENT_RECEIVED,
    title: "Payment received",
    body: `${formatPence(payment.amountPence)} — ${payment.description}`,
    href: "/transactions",
  });
}

/** A notification is visible to a user when targeted at them or account-wide. */
function userScope(userId: string) {
  return { OR: [{ userId }, { userId: null }] };
}

export async function unreadCount(
  accountId: string,
  userId: string,
): Promise<number> {
  return prisma.notification.count({
    where: { accountId, readAt: null, ...userScope(userId) },
  });
}

export async function listForUser(
  accountId: string,
  userId: string,
  opts: { limit?: number } = {},
) {
  return prisma.notification.findMany({
    where: { accountId, ...userScope(userId) },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 30,
  });
}

export async function markRead(id: string, accountId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { id, accountId, ...userScope(userId), readAt: null },
    data: { readAt: new Date() },
  });
}

export async function markAllRead(accountId: string, userId: string) {
  await prisma.notification.updateMany({
    where: { accountId, readAt: null, ...userScope(userId) },
    data: { readAt: new Date() },
  });
}
