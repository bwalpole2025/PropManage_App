// Per-account operational notification preferences (stored in Account.notificationPrefs Json).
// Marketing opt-in is a *separate* Account boolean (a consent flag), not one of these.
//
// NOTE: this is the CLIENT-SAFE entry point (no prisma). Server code that creates
// or reads in-app notifications imports from "@/lib/notifications/service".

export const NotificationCategory = {
  complianceReminders: "complianceReminders",
  rentAndArrears: "rentAndArrears",
  monthlySummary: "monthlySummary",
  productUpdates: "productUpdates",
} as const;
export type NotificationCategory =
  (typeof NotificationCategory)[keyof typeof NotificationCategory];

export const NotificationCategoryLabel: Record<NotificationCategory, string> = {
  complianceReminders: "Compliance reminders",
  rentAndArrears: "Rent & arrears alerts",
  monthlySummary: "Monthly summary",
  productUpdates: "Product updates",
};

export const NotificationCategoryDescription: Record<
  NotificationCategory,
  string
> = {
  complianceReminders: "EPC, gas, electrical and licence expiry nudges.",
  rentAndArrears: "When rent is overdue or a tenant falls into arrears.",
  monthlySummary: "A month-end income & expense digest.",
  productUpdates: "New features and improvements.",
};

export type NotificationPreferences = Record<NotificationCategory, boolean>;

export const DEFAULT_NOTIFICATION_PREFS: NotificationPreferences = {
  complianceReminders: true,
  rentAndArrears: true,
  monthlySummary: true,
  productUpdates: true,
};

/** Coerce the Account.notificationPrefs Json column into a fully-populated object. */
export function parseNotificationPrefs(value: unknown): NotificationPreferences {
  const v = (value ?? {}) as Record<string, unknown>;
  const out = {} as NotificationPreferences;
  for (const key of Object.values(NotificationCategory)) {
    out[key] =
      typeof v[key] === "boolean" ? (v[key] as boolean) : DEFAULT_NOTIFICATION_PREFS[key];
  }
  return out;
}
