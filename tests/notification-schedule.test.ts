import { describe, it, expect } from "vitest";
import {
  zonedParts,
  localDateKey,
  isAfterSendHour,
  localDaysUntil,
} from "@/lib/notifications/schedule";
import {
  offsetBucket,
  selectDueReminders,
  MTD_REMINDER_OFFSETS,
} from "@/lib/notifications/due";

describe("zonedParts / localDateKey", () => {
  it("renders an instant in the target zone", () => {
    const instant = new Date("2026-06-26T07:30:00Z");
    // BST (+1) → 08:30 on the 26th.
    expect(zonedParts(instant, "Europe/London")).toMatchObject({
      year: 2026,
      month: 6,
      day: 26,
      hour: 8,
      ymd: "2026-06-26",
    });
    // EDT (−4) → 03:30 on the 26th.
    expect(zonedParts(instant, "America/New_York").hour).toBe(3);
  });

  it("rolls the local date across the UTC midnight boundary", () => {
    const instant = new Date("2026-07-02T23:30:00Z");
    // London BST → already the 3rd.
    expect(localDateKey(instant, "Europe/London")).toBe("2026-07-03");
    // Los Angeles PDT → still the 2nd.
    expect(localDateKey(instant, "America/Los_Angeles")).toBe("2026-07-02");
  });
});

describe("isAfterSendHour", () => {
  const instant = new Date("2026-06-26T07:30:00Z"); // 08:30 BST / 03:30 EDT
  it("is true at/after the local send hour", () => {
    expect(isAfterSendHour(instant, "Europe/London", 8)).toBe(true);
  });
  it("is false before the local send hour", () => {
    expect(isAfterSendHour(instant, "America/New_York", 8)).toBe(false);
  });
});

describe("localDaysUntil", () => {
  it("measures whole days from local-today to a UTC-midnight target", () => {
    const target = new Date("2026-07-10T00:00:00Z");
    const now = new Date("2026-07-03T07:30:00Z"); // London 08:30 on the 3rd
    expect(localDaysUntil(target, now, "Europe/London")).toBe(7);
  });

  it("counts from the account-local day, not the server day", () => {
    const target = new Date("2026-07-10T00:00:00Z");
    const now = new Date("2026-07-03T02:00:00Z");
    // UTC day is the 3rd → 7 days.
    expect(localDaysUntil(target, now, "UTC")).toBe(7);
    // Los Angeles PDT → still the 2nd → 8 days.
    expect(localDaysUntil(target, now, "America/Los_Angeles")).toBe(8);
  });
});

describe("offsetBucket", () => {
  const offsets = [14, 7, 1];
  it("maps days-until to the smallest still-reachable offset", () => {
    expect(offsetBucket(10, offsets)).toBe(14);
    expect(offsetBucket(14, offsets)).toBe(14);
    expect(offsetBucket(7, offsets)).toBe(7);
    expect(offsetBucket(5, offsets)).toBe(7);
    expect(offsetBucket(1, offsets)).toBe(1);
    expect(offsetBucket(0, offsets)).toBe(1);
  });
  it("returns null outside the widest window or in the past", () => {
    expect(offsetBucket(20, offsets)).toBeNull();
    expect(offsetBucket(-1, offsets)).toBeNull();
  });
  it("single-offset windows (e.g. rent [3]) only match within the window", () => {
    expect(offsetBucket(3, [3])).toBe(3);
    expect(offsetBucket(2, [3])).toBe(3);
    expect(offsetBucket(4, [3])).toBeNull();
  });
});

describe("selectDueReminders", () => {
  it("tags each in-window item with its matched bucket and drops the rest", () => {
    const now = new Date("2026-06-01T09:00:00Z");
    const items = [
      { id: "a", due: new Date("2026-06-15T00:00:00Z") }, // 14 days → bucket 14
      { id: "b", due: new Date("2026-06-08T00:00:00Z") }, // 7 days  → bucket 7
      { id: "c", due: new Date("2026-06-02T00:00:00Z") }, // 1 day   → bucket 1
      { id: "d", due: new Date("2026-07-15T00:00:00Z") }, // far out → dropped
      { id: "e", due: new Date("2026-05-20T00:00:00Z") }, // past    → dropped
    ];
    const due = selectDueReminders(
      items,
      (i) => i.due,
      now,
      "UTC",
      MTD_REMINDER_OFFSETS,
    );
    expect(due.map((d) => [d.item.id, d.offsetDays])).toEqual([
      ["a", 14],
      ["b", 7],
      ["c", 1],
    ]);
  });
});
