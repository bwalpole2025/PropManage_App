"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { refreshObligationsAction } from "@/actions/mtd";
import { Button } from "@/components/ui/button";

/** Pull the latest income sources + obligations from HMRC. */
export function RefreshObligations({ taxYear }: { taxYear: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    setMsg(null);
    start(async () => {
      const res = await refreshObligationsAction(taxYear);
      if (res.error) setMsg(res.error);
      else {
        setMsg(`Loaded ${res.count ?? 0} obligations.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <Button onClick={refresh} disabled={pending} variant="outline" size="sm">
        <RefreshCw className={`h-4 w-4 ${pending ? "animate-spin" : ""}`} />
        Refresh from HMRC
      </Button>
      {msg ? <span className="text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
