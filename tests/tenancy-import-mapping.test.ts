import { describe, it, expect } from "vitest";
import {
  validateTenancyRow,
  tenancyDedupKey,
  type RawTenancyRow,
} from "@/lib/tenancy-import-mapping";
import { DepositScheme, RentFrequency } from "@/lib/enums";
import { DepositSchemeLabel } from "@/lib/deposit-scheme";

const CTX = {
  properties: [
    { id: "p1", addressLine1: "12 Oakfield Road", postcode: "BS6 5AB" },
    { id: "p2", addressLine1: "5 High Street", postcode: "BA1 1AA" },
  ],
};

const baseRow = (over: Partial<RawTenancyRow> = {}): RawTenancyRow => ({
  rowNumber: 2,
  tenantName: "Jane Doe",
  tenantEmail: "jane@example.com",
  propertyAddress: "12 Oakfield Road",
  postcode: "BS6 5AB",
  rent: "1250",
  frequency: "MONTHLY",
  deposit: "1500",
  startDate: "01/06/2026",
  endDate: "",
  rentDueDay: "1",
  ...over,
});

describe("validateTenancyRow", () => {
  it("parses a valid row and matches the property", () => {
    const r = validateTenancyRow(baseRow(), CTX);
    expect(r.ok).toBe(true);
    expect(r.value).toMatchObject({
      tenantName: "Jane Doe",
      tenantEmail: "jane@example.com",
      propertyId: "p1",
      rentPence: 125_000,
      rentFrequency: RentFrequency.MONTHLY,
      depositPence: 150_000,
      rentDueDay: 1,
    });
    // UK day-first date → 1 June 2026.
    expect(r.value!.startDate.toISOString().slice(0, 10)).toBe("2026-06-01");
  });

  it("matches the property case/space-insensitively", () => {
    const r = validateTenancyRow(
      baseRow({ propertyAddress: "12 OAKFIELD ROAD", postcode: "bs65ab" }),
      CTX,
    );
    expect(r.ok).toBe(true);
    expect(r.value!.propertyId).toBe("p1");
  });

  it("errors when no property matches (no auto-create)", () => {
    const r = validateTenancyRow(
      baseRow({ propertyAddress: "99 Nowhere Lane", postcode: "ZZ9 9ZZ" }),
      CTX,
    );
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "propertyAddress")).toBe(true);
  });

  it("rejects a non-numeric rent", () => {
    const r = validateTenancyRow(baseRow({ rent: "lots" }), CTX);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "rent")).toBe(true);
  });

  it("rejects an unknown frequency", () => {
    const r = validateTenancyRow(baseRow({ frequency: "biennially" }), CTX);
    expect(r.ok).toBe(false);
    expect(r.errors.some((e) => e.field === "frequency")).toBe(true);
  });

  it("accepts word frequencies + blank (defaults monthly)", () => {
    expect(validateTenancyRow(baseRow({ frequency: "weekly" }), CTX).value?.rentFrequency).toBe(
      RentFrequency.WEEKLY,
    );
    expect(validateTenancyRow(baseRow({ frequency: "" }), CTX).value?.rentFrequency).toBe(
      RentFrequency.MONTHLY,
    );
  });

  it("requires tenant name and start date", () => {
    expect(validateTenancyRow(baseRow({ tenantName: "" }), CTX).ok).toBe(false);
    expect(validateTenancyRow(baseRow({ startDate: "" }), CTX).ok).toBe(false);
    expect(validateTenancyRow(baseRow({ startDate: "32/13/2026" }), CTX).ok).toBe(false);
  });

  it("rejects an out-of-range rent due day", () => {
    expect(validateTenancyRow(baseRow({ rentDueDay: "40" }), CTX).ok).toBe(false);
  });
});

describe("tenancyDedupKey", () => {
  it("keys on property + tenant + start date", () => {
    const a = tenancyDedupKey({ propertyId: "p1", tenantName: "Jane Doe", startDate: new Date(Date.UTC(2026, 5, 1)) });
    const b = tenancyDedupKey({ propertyId: "p1", tenantName: "JANE DOE", startDate: "2026-06-01" });
    expect(a).toBe(b);
    const c = tenancyDedupKey({ propertyId: "p2", tenantName: "Jane Doe", startDate: "2026-06-01" });
    expect(c).not.toBe(a);
  });
});

describe("DepositSchemeLabel", () => {
  it("labels every deposit scheme", () => {
    for (const s of Object.values(DepositScheme)) {
      expect(DepositSchemeLabel[s]).toBeTruthy();
    }
  });
});
