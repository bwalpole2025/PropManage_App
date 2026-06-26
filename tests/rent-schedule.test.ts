import { describe, it, expect } from "vitest";
import {
  generateRentSchedule,
  firstFutureDueDate,
  nextDueDate,
} from "@/lib/rent";
import { RentStatus } from "@/lib/enums";

const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

describe("generateRentSchedule", () => {
  it("monthly: aligns to rentDueDay and covers ~12 months back + ~12 ahead", () => {
    const now = new Date(2026, 5, 1); // 1 Jun 2026 (local)
    const rows = generateRentSchedule(
      {
        startDate: new Date(2020, 0, 1), // long-running tenancy
        rentFrequency: "MONTHLY",
        rentDueDay: 1,
        rentPence: 125_000,
      },
      { now },
    );
    // Bounded to [now-12mo, now+12mo] → 1 Jun 2025 .. 1 Jun 2027 on the 1st = 25 entries.
    expect(rows.length).toBe(25);
    expect(rows.every((r) => r.expectedPence === 125_000)).toBe(true);
    expect(rows.every((r) => r.dueDate.getDate() === 1)).toBe(true);
    expect(iso(rows[0].dueDate)).toBe("2025-06-01");
    expect(iso(rows[rows.length - 1].dueDate)).toBe("2027-06-01");
  });

  it("marks past periods OVERDUE and today/future DUE", () => {
    const now = new Date(2026, 5, 15);
    const rows = generateRentSchedule(
      { startDate: new Date(2026, 0, 10), rentFrequency: "MONTHLY", rentDueDay: 10, rentPence: 100_000 },
      { now },
    );
    const past = rows.filter((r) => r.dueDate.getTime() < new Date(2026, 5, 15).getTime());
    const future = rows.filter((r) => r.dueDate.getTime() > new Date(2026, 5, 15).getTime());
    expect(past.every((r) => r.status === RentStatus.OVERDUE)).toBe(true);
    expect(future.every((r) => r.status === RentStatus.DUE)).toBe(true);
  });

  it("clamps the due day to short months (Feb)", () => {
    const now = new Date(2026, 1, 15); // Feb 2026
    const rows = generateRentSchedule(
      { startDate: new Date(2026, 1, 1), rentFrequency: "MONTHLY", rentDueDay: 31, rentPence: 100_000 },
      { now, monthsBack: 0 },
    );
    const feb = rows.find((r) => r.dueDate.getMonth() === 1);
    expect(feb?.dueDate.getDate()).toBe(28); // 2026 not a leap year
  });

  it("weekly: steps 7 days from the start date", () => {
    const now = new Date(2026, 5, 1);
    const rows = generateRentSchedule(
      { startDate: new Date(2026, 5, 1), rentFrequency: "WEEKLY", rentDueDay: null, rentPence: 30_000 },
      { now, monthsBack: 0, monthsAhead: 1 },
    );
    expect(iso(rows[0].dueDate)).toBe("2026-06-01");
    expect(iso(rows[1].dueDate)).toBe("2026-06-08");
    expect(iso(rows[2].dueDate)).toBe("2026-06-15");
  });

  it("caps at endDate", () => {
    const now = new Date(2026, 5, 15);
    const rows = generateRentSchedule(
      {
        startDate: new Date(2026, 5, 1),
        endDate: new Date(2026, 8, 1), // ends 1 Sep
        rentFrequency: "MONTHLY",
        rentDueDay: 1,
        rentPence: 100_000,
      },
      { now },
    );
    const last = rows[rows.length - 1];
    expect(last.dueDate.getTime()).toBeLessThanOrEqual(new Date(2026, 8, 1).getTime());
    expect(iso(last.dueDate)).toBe("2026-09-01");
  });

  it("honours maxEntries", () => {
    const now = new Date(2026, 5, 15);
    const rows = generateRentSchedule(
      { startDate: new Date(2020, 0, 1), rentFrequency: "WEEKLY", rentDueDay: null, rentPence: 30_000 },
      { now, maxEntries: 10 },
    );
    expect(rows.length).toBe(10);
  });

  it("firstFutureDueDate matches nextDueDate (no stored nextPaymentDate)", () => {
    const now = new Date(2026, 5, 5); // 5 Jun — the 10th is still upcoming
    const t = { startDate: new Date(2026, 0, 10), rentFrequency: "MONTHLY", rentDueDay: 10 };
    const a = firstFutureDueDate(t, now)!;
    const b = nextDueDate({ ...t, nextPaymentDate: null }, now);
    expect(iso(a)).toBe(iso(b));
    expect(iso(a)).toBe("2026-06-10");
  });

  it("firstFutureDueDate is null once the tenancy has ended", () => {
    const now = new Date(2026, 5, 15);
    // Ended 10 May 2026 → no future due date within the term.
    expect(
      firstFutureDueDate(
        { startDate: new Date(2026, 0, 1), rentFrequency: "MONTHLY", rentDueDay: 1, endDate: new Date(2026, 4, 10) },
        now,
      ),
    ).toBeNull();
    // Ends in the future → the next due date is returned.
    expect(
      iso(
        firstFutureDueDate(
          { startDate: new Date(2026, 0, 1), rentFrequency: "MONTHLY", rentDueDay: 1, endDate: new Date(2027, 0, 1) },
          now,
        )!,
      ),
    ).toBe("2026-07-01");
  });
});
