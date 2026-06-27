"use server";

import { z } from "zod";
import { emailSender } from "@/lib/email";
import { getSessionUser } from "@/lib/auth/active-org";
import { enforceRateLimit, clientIp } from "@/lib/rate-limit";

export interface FeedbackState {
  ok?: boolean;
  error?: string;
}

const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL ?? "support@propmanage.local";

const feedbackSchema = z.object({
  kind: z.enum(["bug", "idea", "question", "other"]).default("other"),
  message: z.string().trim().min(3, "Please add a little more detail.").max(4000),
  page: z.string().max(512).optional(),
});

/**
 * Capture in-app feedback from the floating help button and route it to the
 * support inbox via the EmailSender (mock by default — logs to the dev outbox).
 * No new persistence is introduced; the sender's reply-to is the signed-in user
 * when available.
 */
export async function sendFeedbackAction(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  const parsed = feedbackSchema.safeParse({
    kind: formData.get("kind") ?? "other",
    message: formData.get("message") ?? "",
    page: formData.get("page") ?? undefined,
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Please check the form." };
  }

  const user = await getSessionUser();
  const limited = await enforceRateLimit(
    `feedback:${user?.id ?? (await clientIp())}`,
    5,
    3600,
    "Thanks for all the feedback! Please try again a little later.",
  );
  if (limited) return { error: limited };
  const from = user?.email ?? "anonymous";
  const { kind, message, page } = parsed.data;

  try {
    await emailSender.sendOperationalAlert({
      to: SUPPORT_EMAIL,
      name: "Support",
      subject: `Feedback (${kind}) from ${from}`,
      heading: "New in-app feedback",
      body: `From: ${from}\nType: ${kind}\nPage: ${page ?? "—"}\n\n${message}`,
      href: page ?? null,
    });
  } catch (err) {
    console.error("[feedback] failed to send", err);
    return { error: "Could not send right now — please try again." };
  }

  return { ok: true };
}
