// Per-account notification preferences (stored in Account.notificationPrefs Json).
// Marketing opt-in is a *separate* Account boolean (a consent flag), not modelled
// here.
//
// Preferences are two independent axes that combine multiplicatively:
//   • channels    — HOW a notification reaches you (in-app, email, mobile/push)
//   • categories  — WHICH kinds of operational alert you want
// A notification for category C is delivered on channel H iff BOTH
// `categories[C]` and `channels[H]` are enabled. So toggling a single channel
// (e.g. email off) or a single category (e.g. compliance off) suppresses the
// corresponding alerts — the contract the dispatcher enforces.
//
// NOTE: this is the CLIENT-SAFE entry point (no prisma). Server code that creates
// or reads in-app notifications imports from "@/lib/notifications/service" and
// dispatches via "@/lib/notifications/dispatch".

// ---------------------------------------------------------------------------
// Channels — how alerts are delivered.
// ---------------------------------------------------------------------------

export const NotificationChannel = {
  inApp: "inApp",
  email: "email",
  push: "push",
} as const;
export type NotificationChannel =
  (typeof NotificationChannel)[keyof typeof NotificationChannel];

export const NOTIFICATION_CHANNELS = Object.values(NotificationChannel);

export const NotificationChannelLabel: Record<NotificationChannel, string> = {
  inApp: "In-app",
  email: "Email",
  push: "Mobile / push",
};

export const NotificationChannelDescription: Record<
  NotificationChannel,
  string
> = {
  inApp: "Show in the in-app notifications inbox.",
  email: "Send to your account email address.",
  push: "Send to your verified mobile (requires a verified number).",
};

// ---------------------------------------------------------------------------
// Categories — which kinds of alert.
// ---------------------------------------------------------------------------

export const NotificationCategory = {
  complianceReminders: "complianceReminders",
  rentAndArrears: "rentAndArrears",
  taxDeadlines: "taxDeadlines",
  bankFeed: "bankFeed",
  monthlySummary: "monthlySummary",
  productUpdates: "productUpdates",
} as const;
export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NOTIFICATION_CATEGORIES = Object.values(NotificationCategory);

export const NotificationCategoryLabel: Record<NotificationCategory, string> = {
  complianceReminders: "Compliance reminders",
  rentAndArrears: "Rent & arrears alerts",
  taxDeadlines: "Tax (MTD) deadlines",
  bankFeed: "Bank connection alerts",
  monthlySummary: "Monthly summary",
  productUpdates: "Product updates",
};

export const NotificationCategoryDescription: Record<
  NotificationCategory,
  string
> = {
  complianceReminders: "EPC, gas, electrical and licence expiry nudges.",
  rentAndArrears: "Upcoming rent due, plus overdue / arrears alerts.",
  taxDeadlines: "Making Tax Digital quarterly-update deadlines.",
  bankFeed: "When a bank connection's consent is about to expire.",
  monthlySummary: "A month-end income & expense digest.",
  productUpdates: "New features and improvements.",
};

// ---------------------------------------------------------------------------
// The combined preference object.
// ---------------------------------------------------------------------------

export interface NotificationPreferences {
  channels: Record<NotificationChannel, boolean>;
  categories: Record<NotificationCategory, boolean>;
}

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  channels: { inApp: true, email: true, push: false },
  categories: {
    complianceReminders: true,
    rentAndArrears: true,
    taxDeadlines: true,
    bankFeed: true,
    monthlySummary: true,
    productUpdates: true,
  },
};

function coerceBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * Coerce the Account.notificationPrefs Json column into a fully-populated object.
 * Tolerant of three stored shapes so older rows keep working:
 *   • null / {}                              → all defaults
 *   • LEGACY flat  { complianceReminders, … } → lifted into `categories`
 *   • current      { channels, categories }   → read through
 * Any missing channel/category falls back to its default.
 */
export function parseNotificationPrefs(value: unknown): NotificationPreferences {
  const v = (value ?? {}) as Record<string, unknown>;
  const channelsRaw = (v.channels ?? {}) as Record<string, unknown>;
  // Legacy rows stored categories at the top level; new rows nest them.
  const categoriesRaw = (v.categories ?? v) as Record<string, unknown>;

  const channels = {} as Record<NotificationChannel, boolean>;
  for (const ch of NOTIFICATION_CHANNELS) {
    channels[ch] = coerceBool(
      channelsRaw[ch],
      DEFAULT_NOTIFICATION_PREFS.channels[ch],
    );
  }

  const categories = {} as Record<NotificationCategory, boolean>;
  for (const cat of NOTIFICATION_CATEGORIES) {
    categories[cat] = coerceBool(
      categoriesRaw[cat],
      DEFAULT_NOTIFICATION_PREFS.categories[cat],
    );
  }

  return { channels, categories };
}

/**
 * The channels a notification of `category` should be delivered on, given the
 * account's preferences — the intersection of enabled categories and channels.
 * Pure: the dispatcher and the UI both reason about delivery through this single
 * function, so "disabling a preference suppresses it" holds by construction.
 */
export function resolveDeliveryChannels(
  prefs: NotificationPreferences,
  category: NotificationCategory,
): NotificationChannel[] {
  if (!prefs.categories[category]) return [];
  return NOTIFICATION_CHANNELS.filter((ch) => prefs.channels[ch]);
}

/** Whether a given (category, channel) pair is enabled. */
export function isChannelEnabled(
  prefs: NotificationPreferences,
  category: NotificationCategory,
  channel: NotificationChannel,
): boolean {
  return prefs.categories[category] && prefs.channels[channel];
}
