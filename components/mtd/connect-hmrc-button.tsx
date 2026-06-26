"use client";

import { useState, useTransition } from "react";
import { Link2 } from "lucide-react";
import { startMtdAuthAction } from "@/actions/mtd";
import { Button } from "@/components/ui/button";

/** Begins the HMRC OAuth flow: the user authorises on HMRC's own site. */
export function ConnectHmrcButton({
  reconnect = false,
}: {
  reconnect?: boolean;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function connect() {
    setError(null);
    start(async () => {
      try {
        const { url } = await startMtdAuthAction();
        window.location.href = url;
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button onClick={connect} disabled={pending} variant={reconnect ? "outline" : "primary"}>
        <Link2 className="h-4 w-4" />
        {pending ? "Redirecting…" : reconnect ? "Reconnect to HMRC" : "Connect to HMRC"}
      </Button>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
