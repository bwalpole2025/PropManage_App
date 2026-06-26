import { describe, it, expect } from "vitest";
import { toHmrcMoney, fromHmrcMoney } from "@/lib/mtd/money";

describe("MTD money boundary (pence <-> HMRC pounds)", () => {
  it("converts pence to 2dp pounds", () => {
    expect(toHmrcMoney(125_000)).toBe(1250);
    expect(toHmrcMoney(123_456)).toBe(1234.56);
    expect(toHmrcMoney(0)).toBe(0);
    expect(toHmrcMoney(1)).toBe(0.01);
  });

  it("converts HMRC pounds back to pence (and passes undefined through)", () => {
    expect(fromHmrcMoney(1250)).toBe(125_000);
    expect(fromHmrcMoney(1234.56)).toBe(123_456);
    expect(fromHmrcMoney(0)).toBe(0);
    expect(fromHmrcMoney(undefined)).toBeUndefined();
    expect(fromHmrcMoney(null)).toBeUndefined();
  });

  it("round-trips without a 100x unit leak", () => {
    for (const pence of [0, 1, 99, 100, 125_000, 999_999, 12_345_678]) {
      expect(fromHmrcMoney(toHmrcMoney(pence))).toBe(pence);
    }
  });
});
