import { z } from "zod";

export const profileSchema = z.object({
  firstName: z.string().trim().min(1, "Enter your first name").max(100),
  lastName: z.string().trim().max(100).optional().or(z.literal("")),
  numberOfPropertiesManaged: z.coerce.number().int().min(0).max(100000),
});
export type ProfileInput = z.infer<typeof profileSchema>;

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "Use at least 8 characters"),
});

// E.164: a leading + then 8–15 digits.
export const mobileSchema = z.object({
  mobile: z
    .string()
    .trim()
    .regex(/^\+[1-9]\d{7,14}$/, "Enter a valid mobile, e.g. +447700900123"),
});
export const mobileCodeSchema = z.object({
  code: z.string().trim().regex(/^\d{6}$/, "Enter the 6-digit code"),
});

export const organizationSchema = z.object({
  displayName: z.string().trim().min(1, "Enter a name").max(200),
  timeZone: z
    .string()
    .refine(
      (tz) => Intl.supportedValuesOf("timeZone").includes(tz),
      "Pick a valid time zone",
    ),
  firstTaxYear: z.string().regex(/^\d{4}-\d{2}$/, "Pick a tax year"),
});

export const notificationPrefsSchema = z.object({
  marketingOptIn: z.coerce.boolean(),
  prefs: z.object({
    channels: z.object({
      inApp: z.coerce.boolean(),
      email: z.coerce.boolean(),
      push: z.coerce.boolean(),
    }),
    categories: z.object({
      complianceReminders: z.coerce.boolean(),
      rentAndArrears: z.coerce.boolean(),
      taxDeadlines: z.coerce.boolean(),
      bankFeed: z.coerce.boolean(),
      monthlySummary: z.coerce.boolean(),
      productUpdates: z.coerce.boolean(),
    }),
  }),
});
