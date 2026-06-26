"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveNinoAction } from "@/actions/mtd";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

/** Capture the National Insurance number HMRC requires on every ITSA call. */
export function NinoForm({ current }: { current?: string | null }) {
  const router = useRouter();
  const [nino, setNino] = useState(current ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok?: boolean; error?: string } | null>(null);

  function save() {
    setMsg(null);
    start(async () => {
      const res = await saveNinoAction(nino);
      setMsg(res);
      if (res.ok) router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <div>
        <Label htmlFor="nino">National Insurance number</Label>
        <Input
          id="nino"
          value={nino}
          onChange={(e) => setNino(e.target.value)}
          placeholder="QQ123456C"
          className="w-44 uppercase"
        />
      </div>
      <Button onClick={save} disabled={pending || !nino} variant="outline">
        {pending ? "Saving…" : "Save"}
      </Button>
      {msg?.ok ? <p className="text-xs text-success">Saved.</p> : null}
      {msg?.error ? <p className="text-xs text-danger">{msg.error}</p> : null}
    </div>
  );
}
