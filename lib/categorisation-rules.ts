// Deterministic categorisation rules engine.
//
// Given a transaction's payee/description + amount + direction (and the entity's
// properties/tenancies), propose a category — and where possible a property and
// tenancy — for the user to confirm. The RENT rule keys off a lead-tenant's name
// in the description so confirming it links the tenancy and clears arrears.

import { Sa105Category } from "./sa105";
import { ExtraCategory, type AllCategory } from "./categories";
import { TxnDirection } from "./enums";

export interface SuggestContext {
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; propertyId: string; leadTenantName?: string | null }[];
}

export interface TxnForSuggest {
  description: string;
  merchant?: string | null;
  amountPence: number;
  direction: string;
}

export interface Suggestion {
  category: AllCategory;
  subcategory?: string;
  propertyId?: string;
  tenancyId?: string;
  confidence: number; // 0..1
  reason: string;
}

interface KeywordRule {
  category: AllCategory;
  subcategory?: string;
  keywords: string[];
  confidence: number;
}

const EXPENSE_RULES: KeywordRule[] = [
  { category: Sa105Category.INSURANCE, keywords: ["insurance", "insur", "aviva", "axa", "direct line", "hiscox"], confidence: 0.8 },
  { category: Sa105Category.LETTING_AGENT_FEES, keywords: ["letting", "lettings", "agent fee", "management fee", "property manage"], confidence: 0.75 },
  { category: Sa105Category.COUNCIL_TAX, keywords: ["council tax", "borough council", "city council"], confidence: 0.8 },
  { category: Sa105Category.UTILITIES, subcategory: "Gas", keywords: ["british gas"], confidence: 0.75 },
  { category: Sa105Category.UTILITIES, subcategory: "Electricity", keywords: ["edf", "e.on", "eon energy", "octopus energy", "electricity"], confidence: 0.7 },
  { category: Sa105Category.UTILITIES, subcategory: "Water", keywords: ["thames water", "severn trent", "anglian water", "water board"], confidence: 0.75 },
  { category: Sa105Category.UTILITIES, subcategory: "Broadband", keywords: ["broadband", "virgin media", "talktalk"], confidence: 0.65 },
  { category: Sa105Category.MORTGAGE_INTEREST, keywords: ["mortgage", "btl loan", "buy to let", "loan interest"], confidence: 0.75 },
  { category: Sa105Category.REPAIRS_MAINTENANCE, keywords: ["repair", "plumber", "plumbing", "electrician", "boiler", "screwfix", "wickes", "maintenance", "handyman"], confidence: 0.65 },
  { category: Sa105Category.GROUND_RENT, keywords: ["ground rent"], confidence: 0.85 },
  { category: Sa105Category.SERVICE_CHARGE, keywords: ["service charge", "estate charge", "sinking fund"], confidence: 0.8 },
  { category: Sa105Category.ACCOUNTANCY_LEGAL, keywords: ["solicitor", "accountant", "conveyanc", "legal fee"], confidence: 0.75 },
  { category: Sa105Category.CLEANING_GARDENING, keywords: ["cleaning", "cleaner", "gardening", "gardener", "landscap"], confidence: 0.65 },
  { category: Sa105Category.ADVERTISING, keywords: ["rightmove", "zoopla", "advertis", "tenant find"], confidence: 0.65 },
];

function haystack(t: TxnForSuggest): string {
  return `${t.description} ${t.merchant ?? ""}`.toLowerCase();
}

function matchProperty(
  text: string,
  properties: SuggestContext["properties"],
): string | undefined {
  for (const p of properties) {
    const token = p.addressLine1.split(",")[0].trim().toLowerCase();
    if (token.length > 3 && text.includes(token)) return p.id;
  }
  return undefined;
}

/** Suggest a category (+ property/tenancy) for one transaction, or null. */
export function suggestForTransaction(
  t: TxnForSuggest,
  ctx: SuggestContext,
): Suggestion | null {
  const text = haystack(t);

  if (t.direction === TxnDirection.INCOME) {
    // Rent: a lead-tenant name in the description → that tenancy (high confidence).
    for (const ten of ctx.tenancies) {
      const name = ten.leadTenantName?.trim().toLowerCase();
      if (!name) continue;
      const parts = name.split(/\s+/).filter((p) => p.length > 2);
      if (text.includes(name) || parts.some((p) => text.includes(p))) {
        return {
          category: Sa105Category.RENT_INCOME,
          propertyId: ten.propertyId,
          tenancyId: ten.id,
          confidence: 0.9,
          reason: `Matches tenant “${ten.leadTenantName}”`,
        };
      }
    }
    if (/\brent\b/.test(text)) {
      return {
        category: Sa105Category.RENT_INCOME,
        confidence: 0.5,
        reason: "Mentions “rent”",
      };
    }
    if (/\bdeposit\b/.test(text)) {
      return {
        category: ExtraCategory.DEPOSIT,
        confidence: 0.7,
        reason: "Mentions “deposit”",
      };
    }
    return null;
  }

  // Expense: best keyword rule wins; attach a property by address when possible.
  let best: Suggestion | null = null;
  for (const r of EXPENSE_RULES) {
    const k = r.keywords.find((kw) => text.includes(kw));
    if (k && (!best || r.confidence > best.confidence)) {
      best = {
        category: r.category,
        subcategory: r.subcategory,
        confidence: r.confidence,
        reason: `Matches “${k}”`,
      };
    }
  }
  if (best) {
    const propertyId = matchProperty(text, ctx.properties);
    if (propertyId) best.propertyId = propertyId;
  }
  return best;
}

/** Map of txnId → Suggestion for the uncategorised rows in a list. */
export function suggestForRows(
  rows: Array<TxnForSuggest & { id: string; category: string | null }>,
  ctx: SuggestContext,
): Record<string, Suggestion> {
  const out: Record<string, Suggestion> = {};
  for (const r of rows) {
    if (r.category) continue;
    const s = suggestForTransaction(r, ctx);
    if (s) out[r.id] = s;
  }
  return out;
}
