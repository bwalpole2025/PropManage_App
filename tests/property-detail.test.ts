import { describe, it, expect } from "vitest";
import {
  buildStaticMapUrl,
  computePropertyHeaderMetrics,
  epcBandTone,
  parseCameraPosition,
} from "@/lib/property-finance";
import { cameraPositionSchema } from "@/schemas/property";
import { formatBpPercent } from "@/lib/finance";

describe("computePropertyHeaderMetrics", () => {
  it("derives rent, yield, balance, valuation and LTV (seed figures)", () => {
    // 12 Oakfield Road: £1,250/mo rent, value £340k, mortgage £195k.
    const m = computePropertyHeaderMetrics({
      tenancies: [
        { status: "ACTIVE", rentPence: 125_000, rentFrequency: "MONTHLY" },
      ],
      mortgages: [{ balancePence: 19_500_000 }],
      valuations: [{ amountPence: 34_000_000 }],
      currentValuePence: 34_000_000,
      purchasePricePence: 28_500_000,
    });
    expect(m.monthlyRentPence).toBe(125_000);
    expect(m.annualRentPence).toBe(1_500_000);
    expect(m.mortgageBalancePence).toBe(19_500_000);
    expect(m.latestValuationPence).toBe(34_000_000);
    expect(formatBpPercent(m.ltvBp)).toBe("57.35%"); // 195k / 340k
    // yield = 15,000 / 340,000 = 4.41%
    expect(formatBpPercent(m.annualYieldBp)).toBe("4.41%");
  });

  it("prefers the latest valuation over currentValuePence, sums mortgages", () => {
    const m = computePropertyHeaderMetrics({
      tenancies: [],
      mortgages: [{ balancePence: 1000 }, { balancePence: 2000 }],
      valuations: [{ amountPence: 50_000 }, { amountPence: 40_000 }],
      currentValuePence: 99_999,
    });
    expect(m.mortgageBalancePence).toBe(3000);
    expect(m.latestValuationPence).toBe(50_000); // valuations[0] wins
    expect(m.monthlyRentPence).toBe(0);
  });

  it("yields/LTV are null when there's no valuation", () => {
    const m = computePropertyHeaderMetrics({
      tenancies: [
        { status: "ACTIVE", rentPence: 100_000, rentFrequency: "MONTHLY" },
      ],
      mortgages: [{ balancePence: 1000 }],
      valuations: [],
      currentValuePence: null,
    });
    expect(m.latestValuationPence).toBeNull();
    expect(m.annualYieldBp).toBeNull();
    expect(m.ltvBp).toBeNull();
  });
});

describe("epcBandTone", () => {
  it("maps A/B green, C/D amber, E/F/G red, unknown neutral", () => {
    expect(epcBandTone("A")).toBe("success");
    expect(epcBandTone("b")).toBe("success");
    expect(epcBandTone("C")).toBe("warning");
    expect(epcBandTone("D")).toBe("warning");
    expect(epcBandTone("E")).toBe("danger");
    expect(epcBandTone("G")).toBe("danger");
    expect(epcBandTone(null)).toBe("neutral");
    expect(epcBandTone("Z")).toBe("neutral");
  });
});

describe("parseCameraPosition + buildStaticMapUrl", () => {
  it("parses a valid camera JSON and rejects junk", () => {
    expect(parseCameraPosition({ lat: 51.45, lng: -2.58, zoom: 16 })).toEqual({
      lat: 51.45,
      lng: -2.58,
      heading: undefined,
      pitch: undefined,
      zoom: 16,
    });
    expect(parseCameraPosition(null)).toBeNull();
    expect(parseCameraPosition({ lat: "x", lng: 1 })).toBeNull();
    expect(parseCameraPosition("nope")).toBeNull();
  });

  it("returns null without a key (placeholder path) and a URL with one", () => {
    const pos = { lat: 51.45, lng: -2.58, zoom: 16 };
    expect(buildStaticMapUrl(pos, null)).toBeNull();
    expect(buildStaticMapUrl(pos, undefined)).toBeNull();
    expect(buildStaticMapUrl(null, "KEY")).toBeNull();

    const url = buildStaticMapUrl(pos, "KEY");
    expect(url).toContain("https://maps.googleapis.com/maps/api/staticmap");
    expect(url).toContain("center=51.45%2C-2.58");
    expect(url).toContain("zoom=16");
    expect(url).toContain("key=KEY");
  });

  it("blank camera fields parse to undefined (not 0) — no world-level map", () => {
    // Form FormData turns blank inputs into "" — these must NOT become 0.
    const parsed = cameraPositionSchema.safeParse({
      lat: "51.45",
      lng: "-2.58",
      heading: "",
      pitch: "",
      zoom: "",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.zoom).toBeUndefined();
      expect(parsed.data.heading).toBeUndefined();
      expect(parsed.data.pitch).toBeUndefined();
    }
    // And a position with no zoom falls back to street-level 16, not 0.
    expect(buildStaticMapUrl({ lat: 51.45, lng: -2.58 }, "KEY")).toContain("zoom=16");
    // A persisted spurious 0 is also defended against.
    expect(buildStaticMapUrl({ lat: 51.45, lng: -2.58, zoom: 0 }, "KEY")).toContain(
      "zoom=16",
    );
  });
});
