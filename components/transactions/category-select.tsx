"use client";

import { useEffect, useState, useTransition } from "react";
import { categoriseTransactionAction } from "@/actions/transaction";
import {
  ALL_EXPENSE_CATEGORIES,
  ALL_INCOME_CATEGORIES,
  allCategoryLabel,
  subcategoriesFor,
} from "@/lib/categories";
import { cn } from "@/lib/utils";

/** Inline category + dependent subcategory picker for a ledger row. */
export function CategorySelect({
  transactionId,
  current,
  currentSubcategory,
}: {
  transactionId: string;
  current: string | null;
  currentSubcategory?: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const [category, setCategory] = useState(current ?? "");
  const [subcategory, setSubcategory] = useState(currentSubcategory ?? "");

  // Keep in sync when the server data changes (e.g. after a bulk recategorise).
  useEffect(() => setCategory(current ?? ""), [current]);
  useEffect(() => setSubcategory(currentSubcategory ?? ""), [currentSubcategory]);

  const subs = subcategoriesFor(category);

  function commit(cat: string, sub: string) {
    if (!cat) return;
    startTransition(() =>
      categoriseTransactionAction(transactionId, cat, sub || null),
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <select
        value={category}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          setCategory(v);
          setSubcategory("");
          commit(v, "");
        }}
        className={cn(
          "h-8 rounded-md border border-input bg-card px-2 text-xs",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          !current && "border-warning/60 text-warning-foreground",
          pending && "opacity-60",
        )}
      >
        <option value="" disabled>
          Uncategorised…
        </option>
        <optgroup label="Income">
          {ALL_INCOME_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {allCategoryLabel[c]}
            </option>
          ))}
        </optgroup>
        <optgroup label="Expenses">
          {ALL_EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {allCategoryLabel[c]}
            </option>
          ))}
        </optgroup>
      </select>
      {subs.length > 0 ? (
        <select
          value={subcategory}
          disabled={pending}
          onChange={(e) => {
            const v = e.target.value;
            setSubcategory(v);
            commit(category, v);
          }}
          className="h-7 rounded-md border border-input bg-card px-2 text-[11px] text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">— subcategory —</option>
          {subs.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      ) : null}
    </div>
  );
}
