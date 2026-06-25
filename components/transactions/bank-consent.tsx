"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark, ShieldCheck } from "lucide-react";
import { completeBankLinkAction } from "@/actions/bank";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const INSTITUTIONS = [
  { id: "mock-bank", name: "Mock Bank (demo)" },
  { id: "monzo-sandbox", name: "Monzo (sandbox)" },
  { id: "starling-sandbox", name: "Starling (sandbox)" },
];

export function BankConsent({ linkSessionId }: { linkSessionId: string }) {
  const router = useRouter();
  const [selected, setSelected] = useState(INSTITUTIONS[0].id);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const institution = INSTITUTIONS.find((i) => i.id === selected)!;

  function allow() {
    setError(null);
    start(async () => {
      try {
        await completeBankLinkAction({
          linkSessionId,
          code: "mock-auth-code",
          institutionName: institution.name,
        });
        router.push("/transactions");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="space-y-5 pt-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Landmark className="h-5 w-5" />
          </span>
          <div>
            <p className="font-semibold">Choose your bank</p>
            <p className="text-sm text-muted-foreground">
              You&apos;ll be asked to authorise read-only access.
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {INSTITUTIONS.map((i) => (
            <label
              key={i.id}
              className="flex cursor-pointer items-center gap-3 rounded-md border border-border px-3 py-2 text-sm hover:bg-muted"
            >
              <input
                type="radio"
                name="institution"
                value={i.id}
                checked={selected === i.id}
                onChange={() => setSelected(i.id)}
              />
              {i.name}
            </label>
          ))}
        </div>

        <p className="flex items-start gap-2 rounded-md bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" />
          By allowing access, {institution.name} shares your account and
          transaction data with PropManage via open banking. PropManage never
          sees your bank login — only a secure, revocable access token.
        </p>

        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end gap-2">
          <Button
            variant="ghost"
            onClick={() => router.push("/transactions")}
            disabled={pending}
          >
            Deny
          </Button>
          <Button onClick={allow} disabled={pending}>
            {pending ? "Connecting…" : "Allow access"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
