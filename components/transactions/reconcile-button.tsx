"use client";

import { useTransition } from "react";
import { Check } from "lucide-react";
import { reconcileTransactionAction } from "@/actions/transaction";
import { Button } from "@/components/ui/button";

export function ReconcileButton({ transactionId }: { transactionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(() => reconcileTransactionAction(transactionId))
      }
    >
      <Check className="h-4 w-4" />
      {pending ? "Confirming…" : "Confirm match"}
    </Button>
  );
}
