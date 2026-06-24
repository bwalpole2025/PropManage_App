"use client";

import { useTransition } from "react";
import { categoriseTransactionAction } from "@/actions/transaction";
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  Sa105CategoryLabel,
} from "@/lib/sa105";
import { cn } from "@/lib/utils";

export function CategorySelect({
  transactionId,
  current,
}: {
  transactionId: string;
  current: string | null;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <select
      defaultValue={current ?? ""}
      disabled={pending}
      onChange={(e) => {
        const value = e.target.value;
        if (!value) return;
        startTransition(() => categoriseTransactionAction(transactionId, value));
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
        {INCOME_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {Sa105CategoryLabel[c]}
          </option>
        ))}
      </optgroup>
      <optgroup label="Expenses">
        {EXPENSE_CATEGORIES.map((c) => (
          <option key={c} value={c}>
            {Sa105CategoryLabel[c]}
          </option>
        ))}
      </optgroup>
    </select>
  );
}
