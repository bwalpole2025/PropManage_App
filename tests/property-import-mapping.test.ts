import { describe, it, expect } from "vitest";
import {
  detectPropertyMapping,
  propertyDedupKey,
  toRawPropertyRow,
  validatePropertyRow,
  type PropertyColumnMapping,
} from "@/lib/property-import-mapping";
import { PropertyType } from "@/lib/enums";

const MAP: PropertyColumnMapping = {
  addressLine1: 0,
  city: 1,
  postcode: 2,
  propertyType: 3,
  bedrooms: 4,
};
const raw = (cells: string[]) => toRawPropertyRow(cells, MAP, 2);

describe("property import mapping", () => {
  it("auto-detects headers by alias", () => {
    const m = detectPropertyMapping(["Address", "Town", "Post Code", "Type", "Beds"]);
    expect(m.addressLine1).toBe(0);
    expect(m.city).toBe(1);
    expect(m.postcode).toBe(2);
    expect(m.propertyType).toBe(3);
    expect(m.bedrooms).toBe(4);
  });

  it("validates a good row and parses type/bedrooms", () => {
    const r = validatePropertyRow(raw(["12 Oak St", "Bristol", "BS1 4TY", "terraced", "3"]));
    expect(r.ok).toBe(true);
    expect(r.value?.propertyType).toBe(PropertyType.TERRACED);
    expect(r.value?.bedrooms).toBe(3);
  });

  it("defaults blank type to FLAT; flags missing required + bad values", () => {
    expect(
      validatePropertyRow(raw(["12 Oak", "Bristol", "BS1", "", ""])).value?.propertyType,
    ).toBe(PropertyType.FLAT);
    expect(
      validatePropertyRow(raw(["", "Bristol", "BS1", "", ""])).errors.some(
        (e) => e.field === "addressLine1",
      ),
    ).toBe(true);
    expect(
      validatePropertyRow(raw(["A", "", "BS1", "", ""])).errors.some((e) => e.field === "city"),
    ).toBe(true);
    expect(
      validatePropertyRow(raw(["A", "B", "C", "spaceship", ""])).errors.some(
        (e) => e.field === "propertyType",
      ),
    ).toBe(true);
    expect(
      validatePropertyRow(raw(["A", "B", "C", "", "99"])).errors.some(
        (e) => e.field === "bedrooms",
      ),
    ).toBe(true);
  });

  it("dedupKey normalises postcode whitespace + case", () => {
    expect(propertyDedupKey({ addressLine1: "12 Oak St", postcode: "bs1 4ty" })).toBe(
      propertyDedupKey({ addressLine1: "12 OAK ST", postcode: "BS14TY" }),
    );
  });
});
