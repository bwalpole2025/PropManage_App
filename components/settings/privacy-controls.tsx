"use client";

import { useActionState, useState, useTransition } from "react";
import { Download, Cookie, Trash2, Loader2 } from "lucide-react";
import {
  setMarketingOptInAction,
  deleteAccountDataAction,
  type PrivacyState,
} from "@/actions/privacy";
import { clearConsent } from "@/lib/consent";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function PrivacyControls({
  accountName,
  marketingOptIn,
  canManage,
}: {
  accountName: string;
  marketingOptIn: boolean;
  canManage: boolean;
}) {
  return (
    <div className="space-y-6">
      <ExportCard />
      <MarketingCard initial={marketingOptIn} canManage={canManage} />
      <CookiePreferencesCard />
      {canManage ? <DangerZone accountName={accountName} /> : null}
    </div>
  );
}

function ExportCard() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5 text-primary" /> Export my data
        </CardTitle>
        <CardDescription>
          Download a complete copy of this account&apos;s data as JSON
          (properties, tenancies, transactions, documents and more). Encrypted
          provider tokens are never included.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* A plain download link — the route streams the file with a filename. */}
        <a href="/api/account/export" download>
          <Button variant="outline">Download JSON export</Button>
        </a>
      </CardContent>
    </Card>
  );
}

function MarketingCard({
  initial,
  canManage,
}: {
  initial: boolean;
  canManage: boolean;
}) {
  const [optIn, setOptIn] = useState(initial);
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function toggle(next: boolean) {
    setOptIn(next);
    start(async () => {
      const res = await setMarketingOptInAction(next);
      setMsg(res.error ?? res.success ?? null);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Marketing emails</CardTitle>
        <CardDescription>
          Product news and tips. Separate from operational alerts, which you
          control under Notifications.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-between gap-4">
        <Label htmlFor="marketing-optin" className="text-sm">
          Send me product &amp; marketing emails
        </Label>
        <div className="flex items-center gap-3">
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          ) : null}
          <Switch
            id="marketing-optin"
            checked={optIn}
            disabled={!canManage || pending}
            onCheckedChange={toggle}
            aria-label="Send me product and marketing emails"
          />
        </div>
      </CardContent>
      {msg ? (
        <CardContent className="pt-0 text-sm text-muted-foreground">{msg}</CardContent>
      ) : null}
    </Card>
  );
}

function CookiePreferencesCard() {
  const [done, setDone] = useState(false);
  function reset() {
    clearConsent();
    window.dispatchEvent(new Event("pm:consent-reset"));
    setDone(true);
  }
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Cookie className="h-5 w-5 text-primary" /> Cookie preferences
        </CardTitle>
        <CardDescription>
          Re-open the cookie banner to change which cookies you allow.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-3">
        <Button variant="outline" onClick={reset}>
          Manage cookie preferences
        </Button>
        {done ? (
          <span className="text-sm text-muted-foreground">
            Banner re-opened at the bottom of the screen.
          </span>
        ) : null}
      </CardContent>
    </Card>
  );
}

function DangerZone({ accountName }: { accountName: string }) {
  const [state, action, pending] = useActionState<PrivacyState, FormData>(
    deleteAccountDataAction,
    {},
  );
  const [confirm, setConfirm] = useState("");

  return (
    <Card className="border-danger/40">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-danger">
          <Trash2 className="h-5 w-5" /> Delete this account
        </CardTitle>
        <CardDescription>
          Permanently erase this account and all of its data — properties,
          tenancies, transactions, documents and history. This cannot be undone.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="confirmName">
              Type <span className="font-semibold">{accountName}</span> to confirm
            </Label>
            <Input
              id="confirmName"
              name="confirmName"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="off"
              placeholder={accountName}
            />
          </div>
          {state.error ? (
            <p className="text-sm text-danger" role="alert">
              {state.error}
            </p>
          ) : null}
          <Button
            type="submit"
            variant="danger"
            disabled={pending || confirm !== accountName}
          >
            {pending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Deleting…
              </>
            ) : (
              "Delete account permanently"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
