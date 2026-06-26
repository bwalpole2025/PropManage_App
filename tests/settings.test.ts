import { describe, it, expect } from "vitest";
import { taxYearOptions } from "@/lib/format";
import {
  parseNotificationPrefs,
  DEFAULT_NOTIFICATION_PREFS,
  NotificationCategory,
} from "@/lib/notifications";

describe("taxYearOptions", () => {
  it("lists tax years from a start year down to an end year, newest first", () => {
    const years = taxYearOptions(2026, 2014);
    expect(years[0]).toBe("2026-27");
    expect(years[years.length - 1]).toBe("2014-15");
    expect(years).toHaveLength(13); // 2026..2014 inclusive
    expect(years).toContain("2020-21");
  });

  it("formats the second component as two digits with century rollover", () => {
    expect(taxYearOptions(1999, 1999)).toEqual(["1999-00"]);
  });
});

describe("parseNotificationPrefs", () => {
  it("defaults all channels + categories when the column is null/empty", () => {
    expect(parseNotificationPrefs(null)).toEqual(DEFAULT_NOTIFICATION_PREFS);
    expect(parseNotificationPrefs({})).toEqual(DEFAULT_NOTIFICATION_PREFS);
  });

  it("reads the nested channels + categories shape and ignores unknown keys", () => {
    const parsed = parseNotificationPrefs({
      channels: { email: false },
      categories: { [NotificationCategory.complianceReminders]: false },
      somethingElse: 123,
    });
    expect(parsed.channels.email).toBe(false);
    expect(parsed.channels.inApp).toBe(true); // unset → default
    expect(parsed.categories.complianceReminders).toBe(false);
    expect(parsed.categories.rentAndArrears).toBe(true); // unset → default true
  });

  it("lifts the LEGACY flat category shape into `categories` (back-compat)", () => {
    // Older rows stored category booleans at the top level, no `channels`.
    const parsed = parseNotificationPrefs({
      [NotificationCategory.complianceReminders]: false,
      [NotificationCategory.rentAndArrears]: true,
    });
    expect(parsed.categories.complianceReminders).toBe(false);
    expect(parsed.categories.rentAndArrears).toBe(true);
    expect(parsed.channels).toEqual(DEFAULT_NOTIFICATION_PREFS.channels);
  });

  it("returns a fully-populated object for every category", () => {
    const parsed = parseNotificationPrefs(undefined);
    for (const key of Object.values(NotificationCategory)) {
      expect(typeof parsed.categories[key]).toBe("boolean");
    }
  });
});
