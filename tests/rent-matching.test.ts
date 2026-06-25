import { describe, it, expect } from "vitest";
import { rentEntryStatus } from "@/lib/rent-matching";
import { RentStatus } from "@/lib/enums";

const PAST = new Date("2026-05-01");
const FUTURE = new Date("2026-08-01");
const NOW = new Date("2026-06-25");

describe("rentEntryStatus (the shared status decision)", () => {
  it("is PAID once received covers expected, regardless of due date", () => {
    expect(rentEntryStatus(125000, 125000, PAST, NOW)).toBe(RentStatus.PAID);
    expect(rentEntryStatus(130000, 125000, FUTURE, NOW)).toBe(RentStatus.PAID);
  });

  it("is OVERDUE when nothing received and past due", () => {
    expect(rentEntryStatus(0, 125000, PAST, NOW)).toBe(RentStatus.OVERDUE);
  });

  it("is PARTIAL when some (but not all) received", () => {
    expect(rentEntryStatus(60000, 125000, PAST, NOW)).toBe(RentStatus.PARTIAL);
    expect(rentEntryStatus(60000, 125000, FUTURE, NOW)).toBe(RentStatus.PARTIAL);
  });

  it("is DUE when nothing received and not yet past due", () => {
    expect(rentEntryStatus(0, 125000, FUTURE, NOW)).toBe(RentStatus.DUE);
  });

  it("reverses cleanly: a full payment then its removal returns to OVERDUE", () => {
    // Apply: 0 → 125000 (PAID). Remove: 125000 → 0 (OVERDUE again).
    const afterPay = rentEntryStatus(0 + 125000, 125000, PAST, NOW);
    const afterReverse = rentEntryStatus(125000 - 125000, 125000, PAST, NOW);
    expect(afterPay).toBe(RentStatus.PAID);
    expect(afterReverse).toBe(RentStatus.OVERDUE);
  });
});
