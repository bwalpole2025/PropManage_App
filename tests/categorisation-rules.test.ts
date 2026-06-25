import { describe, it, expect } from "vitest";
import {
  suggestForTransaction,
  suggestForRows,
  type SuggestContext,
} from "@/lib/categorisation-rules";
import { Sa105Category } from "@/lib/sa105";
import { ExtraCategory } from "@/lib/categories";
import { TxnDirection } from "@/lib/enums";

const ctx: SuggestContext = {
  properties: [{ id: "p1", addressLine1: "12 Oak Street" }],
  tenancies: [{ id: "t1", propertyId: "p1", leadTenantName: "James Smith" }],
};

describe("rules engine", () => {
  it("suggests rent + the tenancy when a lead-tenant name appears (acceptance hook)", () => {
    const s = suggestForTransaction(
      {
        description: "BANK CREDIT TENANT J SMITH RENT",
        amountPence: 125000,
        direction: TxnDirection.INCOME,
      },
      ctx,
    );
    expect(s?.category).toBe(Sa105Category.RENT_INCOME);
    expect(s?.tenancyId).toBe("t1");
    expect(s?.propertyId).toBe("p1");
  });

  it("suggests expense categories from the payee/description", () => {
    expect(
      suggestForTransaction(
        { description: "DIRECT DEBIT LANDLORD INSURANCE CO", amountPence: 8900, direction: TxnDirection.EXPENSE },
        ctx,
      )?.category,
    ).toBe(Sa105Category.INSURANCE);
    const utilities = suggestForTransaction(
      { description: "BRITISH GAS energy", amountPence: 5000, direction: TxnDirection.EXPENSE },
      ctx,
    );
    expect(utilities?.category).toBe(Sa105Category.UTILITIES);
    expect(utilities?.subcategory).toBe("Gas");
  });

  it("recognises deposits as the non-taxable extra category", () => {
    expect(
      suggestForTransaction(
        { description: "TENANCY DEPOSIT received", amountPence: 100000, direction: TxnDirection.INCOME },
        ctx,
      )?.category,
    ).toBe(ExtraCategory.DEPOSIT);
  });

  it("returns nothing for an unrecognisable transaction", () => {
    expect(
      suggestForTransaction(
        { description: "ATM WITHDRAWAL", amountPence: 2000, direction: TxnDirection.EXPENSE },
        ctx,
      ),
    ).toBeNull();
  });

  it("only suggests for uncategorised rows", () => {
    const out = suggestForRows(
      [
        { id: "a", category: null, description: "J SMITH RENT", amountPence: 125000, direction: TxnDirection.INCOME },
        { id: "b", category: Sa105Category.RENT_INCOME, description: "J SMITH RENT", amountPence: 125000, direction: TxnDirection.INCOME },
      ],
      ctx,
    );
    expect(out.a?.category).toBe(Sa105Category.RENT_INCOME);
    expect(out.b).toBeUndefined();
  });
});
