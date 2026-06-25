"use client";

import Image from "next/image";
import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, ShieldCheck, MailCheck } from "lucide-react";
import {
  beginTotpEnrollmentAction,
  confirmTotpEnrollmentAction,
  disableTotpAction,
  type SecurityFormState,
} from "@/actions/security";
import { requestEmailVerificationAction } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function SecurityForm({
  emailVerified,
  twoFactorEnabled,
}: {
  emailVerified: boolean;
  twoFactorEnabled: boolean;
}) {
  return (
    <div className="space-y-6">
      <EmailVerificationCard verified={emailVerified} />
      <TotpCard enabled={twoFactorEnabled} />
    </div>
  );
}

function EmailVerificationCard({ verified }: { verified: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="h-5 w-5 text-primary" /> Email verification
        </CardTitle>
        <CardDescription>
          Verifying your email secures account recovery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {verified ? (
          <Badge tone="success">
            <CheckCircle2 className="h-3 w-3" /> Verified
          </Badge>
        ) : (
          <>
            <Badge tone="warning">Not verified</Badge>
            <div>
              <Button
                variant="outline"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    const res = await requestEmailVerificationAction();
                    setMsg(res.success ?? res.error ?? null);
                  })
                }
              >
                {pending ? "Sending…" : "Resend verification email"}
              </Button>
            </div>
            {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function TotpCard({ enabled }: { enabled: boolean }) {
  const [enroll, setEnroll] = useState<{
    qrDataUrl: string;
    secret: string;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirmState, confirmAction] = useActionState<
    SecurityFormState,
    FormData
  >(confirmTotpEnrollmentAction, {});
  const [isEnabled, setIsEnabled] = useState(enabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-accent" /> Two-factor authentication
          <Badge tone="neutral">Optional</Badge>
        </CardTitle>
        <CardDescription>
          Add a time-based one-time passcode (TOTP) from an authenticator app.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEnabled || confirmState.success ? (
          <>
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> Enabled
            </Badge>
            <div>
              <Button
                variant="ghost"
                className="text-danger hover:bg-danger/10"
                disabled={pending}
                onClick={() =>
                  startTransition(async () => {
                    await disableTotpAction();
                    setIsEnabled(false);
                    setEnroll(null);
                  })
                }
              >
                Disable 2FA
              </Button>
            </div>
          </>
        ) : !enroll ? (
          <Button
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                const res = await beginTotpEnrollmentAction();
                setEnroll({ qrDataUrl: res.qrDataUrl, secret: res.secret });
              })
            }
          >
            {pending ? "Preparing…" : "Set up 2FA"}
          </Button>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Scan this with your authenticator app, then enter the 6-digit code
              to confirm.
            </p>
            <Image
              src={enroll.qrDataUrl}
              alt="TOTP QR code"
              width={180}
              height={180}
              className="rounded-md border border-border"
              unoptimized
            />
            <p className="text-xs text-muted-foreground">
              Or enter this secret manually:{" "}
              <code className="rounded bg-muted px-1">{enroll.secret}</code>
            </p>
            <form action={confirmAction} className="flex items-end gap-2">
              <div>
                <Label htmlFor="code">6-digit code</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  className="w-32"
                  required
                />
              </div>
              <Button type="submit">Confirm</Button>
            </form>
            {confirmState.error ? (
              <p className="text-sm text-danger">{confirmState.error}</p>
            ) : null}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
