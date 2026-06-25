// Pure mapping + validation for the property importer (no prisma/react/node) —
// shared by the client wizard preview and the server commit. Mirrors
// lib/import-mapping.ts.

import { PropertyType } from "./enums";

export const PROPERTY_IMPORT_FIELDS = [
  { key: "addressLine1", label: "Address line 1", required: true },
  { key: "addressLine2", label: "Address line 2", required: false },
  { key: "city", label: "City", required: true },
  { key: "postcode", label: "Postcode", required: true },
  { key: "propertyType", label: "Type", required: false },
  { key: "bedrooms", label: "Bedrooms", required: false },
] as const;
export type PropertyImportField = (typeof PROPERTY_IMPORT_FIELDS)[number]["key"];
export type PropertyColumnMapping = Partial<Record<PropertyImportField, number | null>>;

const ALIASES: Record<PropertyImportField, string[]> = {
  addressLine1: ["address line 1", "address1", "address", "addressline1", "street"],
  addressLine2: ["address line 2", "address2", "addressline2"],
  city: ["city", "town"],
  postcode: ["postcode", "post code", "zip", "postal code"],
  propertyType: ["type", "property type", "propertytype"],
  bedrooms: ["bedrooms", "beds", "bedroom"],
};

export function detectPropertyMapping(headers: string[]): PropertyColumnMapping {
  const norm = headers.map((h) => (h ?? "").trim().toLowerCase());
  const mapping: PropertyColumnMapping = {};
  for (const f of PROPERTY_IMPORT_FIELDS) {
    const idx = norm.findIndex((h) => ALIASES[f.key].includes(h));
    if (idx >= 0) mapping[f.key] = idx;
  }
  return mapping;
}

export interface RawPropertyRow {
  rowNumber: number;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  postcode: string;
  propertyType?: string;
  bedrooms?: string;
}

export interface ParsedPropertyRow {
  rowNumber: number;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  postcode: string;
  propertyType: PropertyType;
  bedrooms: number | null;
}

export interface PropFieldError {
  field: PropertyImportField | "row";
  message: string;
}
export interface PropRowResult {
  ok: boolean;
  value?: ParsedPropertyRow;
  errors: PropFieldError[];
}

export function toRawPropertyRow(
  cells: string[],
  mapping: PropertyColumnMapping,
  rowNumber: number,
): RawPropertyRow {
  const at = (f: PropertyImportField) => {
    const idx = mapping[f];
    return idx == null ? "" : (cells[idx] ?? "").toString();
  };
  return {
    rowNumber,
    addressLine1: at("addressLine1"),
    addressLine2: at("addressLine2"),
    city: at("city"),
    postcode: at("postcode"),
    propertyType: at("propertyType"),
    bedrooms: at("bedrooms"),
  };
}

const TYPE_WORDS: Record<string, PropertyType> = {
  flat: PropertyType.FLAT,
  apartment: PropertyType.FLAT,
  terraced: PropertyType.TERRACED,
  terrace: PropertyType.TERRACED,
  "semi-detached": PropertyType.SEMI_DETACHED,
  semi: PropertyType.SEMI_DETACHED,
  detached: PropertyType.DETACHED,
  bungalow: PropertyType.BUNGALOW,
  hmo: PropertyType.HMO,
  commercial: PropertyType.COMMERCIAL,
  other: PropertyType.OTHER,
};

function parseType(raw: string): PropertyType | "invalid" | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null; // blank → default applied by caller
  const upper = s.toUpperCase();
  if (Object.prototype.hasOwnProperty.call(PropertyType, upper)) {
    return PropertyType[upper as keyof typeof PropertyType];
  }
  if (Object.prototype.hasOwnProperty.call(TYPE_WORDS, s)) return TYPE_WORDS[s];
  return "invalid";
}

export function validatePropertyRow(raw: RawPropertyRow): PropRowResult {
  const errors: PropFieldError[] = [];
  const addressLine1 = raw.addressLine1?.trim() ?? "";
  const city = raw.city?.trim() ?? "";
  const postcode = raw.postcode?.trim() ?? "";

  if (!addressLine1) errors.push({ field: "addressLine1", message: "Address line 1 is required" });
  if (!city) errors.push({ field: "city", message: "City is required" });
  if (!postcode) errors.push({ field: "postcode", message: "Postcode is required" });

  const typed = parseType(raw.propertyType ?? "");
  if (typed === "invalid") {
    errors.push({ field: "propertyType", message: `Unknown type "${raw.propertyType}"` });
  }
  const propertyType = typed && typed !== "invalid" ? typed : PropertyType.FLAT;

  let bedrooms: number | null = null;
  const rawBeds = raw.bedrooms?.trim() ?? "";
  if (rawBeds) {
    // Plain digits only — rejects 1e1, 0x10, 3.0, etc.
    if (!/^\d+$/.test(rawBeds) || Number(rawBeds) > 50) {
      errors.push({ field: "bedrooms", message: `Invalid bedrooms "${rawBeds}"` });
    } else bedrooms = Number(rawBeds);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    errors: [],
    value: {
      rowNumber: raw.rowNumber,
      addressLine1,
      addressLine2: raw.addressLine2?.trim() || null,
      city,
      postcode,
      propertyType,
      bedrooms,
    },
  };
}

/** Dedup key for a property = address line 1 + normalised postcode. */
export function propertyDedupKey(r: {
  addressLine1: string;
  postcode: string;
}): string {
  return [
    r.addressLine1.trim().toLowerCase(),
    r.postcode.trim().toLowerCase().replace(/\s+/g, ""),
  ].join("|");
}
