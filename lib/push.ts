// Mock mobile/push sender — mirrors lib/email/mock.ts and lib/sms.ts. Push is
// the "optional mobile/push" notification channel; in local dev the payload is
// logged and recorded in an in-memory outbox so tests/drives can read it back.
// A real driver (FCM / APNs / Expo) can branch on process.env.PUSH_DRIVER later.

export interface PushOutboxEntry {
  id: string;
  to: string; // the user's verified mobile (mock target)
  title: string;
  body: string;
  href?: string | null;
  sentAt: string;
}

const outbox: PushOutboxEntry[] = [];
export function getPushOutbox(): readonly PushOutboxEntry[] {
  return outbox;
}
export function clearPushOutbox(): void {
  outbox.length = 0;
}

let counter = 1;

export async function sendPush(input: {
  to: string;
  title: string;
  body: string;
  href?: string | null;
}): Promise<{ id: string }> {
  const id = `mock-push-${counter++}`;
  outbox.push({
    id,
    to: input.to,
    title: input.title,
    body: input.body,
    href: input.href ?? null,
    sentAt: new Date().toISOString(),
  });
  console.log(`\n[push:mock] → ${input.to}: ${input.title} — ${input.body}\n`);
  return { id };
}
