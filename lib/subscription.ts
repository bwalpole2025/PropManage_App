// Trial / subscription model + access-gating helpers. Client-safe (no prisma).
// Premium functionality is gated unless the account subscription is ACTIVE; a
// trial grants limited access with conversion prompts. Activating during the
// trial schedules the first charge for the trial-end date.

import { daysUntil } from "@/lib/format";
import { SubscriptionStatus } from "@/lib/enums";

export const TRIAL_DAYS = 30;
export const PLAN_NAME = "PropManage Pro";
// Single source of truth for the Pro price — the landing pricing page reads this
// too (components/landing/pricing.tsx) so the marketing page and the in-app
// subscription tab can never show different numbers.
export const PLAN_PRICE_PENCE = 850; // £8.50
export const PLAN_INTERVAL = "month";
/** Card billing runs through this provider's HOSTED checkout — we never see raw card data. */
export const PAYMENT_PROVIDER = "Stripe";

/** Premium features/data are gated unless the subscription is ACTIVE. */
export function premiumLocked(status: string | null | undefined): boolean {
  return status !== SubscriptionStatus.ACTIVE;
}

export interface SubscriptionView {
  status: string;
  isActive: boolean;
  isTrialing: boolean;
  trialEndsAt: string | null;
  daysLeft: number | null;
  trialExpired: boolean;
  premiumLocked: boolean;
  /** When billing begins. Activating mid-trial schedules it for the trial end. */
  firstChargeDate: string;
}

export function trialDaysLeft(
  trialEndsAt: string | Date | null,
  now: Date = new Date(),
): number | null {
  if (!trialEndsAt) return null;
  return Math.max(0, daysUntil(trialEndsAt, now));
}

export function subscriptionView(
  input: { status: string; trialEndsAt: string | Date | null },
  now: Date = new Date(),
): SubscriptionView {
  const status = input.status;
  const isActive = status === SubscriptionStatus.ACTIVE;
  const isTrialing = status === SubscriptionStatus.TRIALING;
  const trialEndsAt = input.trialEndsAt
    ? new Date(input.trialEndsAt).toISOString()
    : null;
  const daysLeft = isTrialing ? trialDaysLeft(input.trialEndsAt, now) : null;
  const trialExpired =
    isTrialing && trialEndsAt != null && new Date(trialEndsAt) <= now;
  // Billing starts at the trial end if it's still in the future, otherwise now.
  const firstChargeDate =
    trialEndsAt && new Date(trialEndsAt) > now ? trialEndsAt : now.toISOString();
  return {
    status,
    isActive,
    isTrialing,
    trialEndsAt,
    daysLeft,
    trialExpired,
    premiumLocked: !isActive,
    firstChargeDate,
  };
}

/** New accounts begin a TRIAL_DAYS free trial from `now`. */
export function trialEndDateFromNow(now: Date = new Date()): Date {
  return new Date(now.getTime() + TRIAL_DAYS * 86_400_000);
}

/** "£8.50/month" style label. */
export function planPriceLabel(): string {
  return `£${(PLAN_PRICE_PENCE / 100).toFixed(2)}/${PLAN_INTERVAL}`;
}
