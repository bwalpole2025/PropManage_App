import { describe, it, expect } from "vitest";
import {
  parseMoneyRequired,
  parseMoneyOptional,
  parseRentDueDay,
} from "@/lib/tenancy-parse";

describe("parseMoneyRequired", () => {
  it("parses valid money to pence", () => {
    expect(parseMoneyRequired("Rent", "1250")).toBe(125_000);
    expect(parseMoneyRequired("Rent", "£1,250.50")).toBe(125_050);
  });
  it("rejects non-numeric and non-positive", () => {
    expect(() => parseMoneyRequired("Rent", "abc")).toThrow(/number/);
    expect(() => parseMoneyRequired("Rent", "0")).toThrow(/greater than zero/);
  });
});

describe("parseMoneyOptional", () => {
  it("undefined/blank → undefined; valid → pence; garbage → throws", () => {
    expect(parseMoneyOptional("Deposit", undefined)).toBeUndefined();
    expect(parseMoneyOptional("Deposit", "")).toBeUndefined();
    expect(parseMoneyOptional("Deposit", "1500")).toBe(150_000);
    expect(() => parseMoneyOptional("Deposit", "lots")).toThrow(/number/);
  });
});

describe("parseRentDueDay", () => {
  it("absent → undefined; blank → null; 1..31 → int; else throws", () => {
    expect(parseRentDueDay(undefined)).toBeUndefined();
    expect(parseRentDueDay("")).toBeNull();
    expect(parseRentDueDay("15")).toBe(15);
    expect(() => parseRentDueDay("0")).toThrow(/between 1 and 31/);
    expect(() => parseRentDueDay("40")).toThrow(/between 1 and 31/);
    expect(() => parseRentDueDay("abc")).toThrow(/between 1 and 31/);
  });
});
