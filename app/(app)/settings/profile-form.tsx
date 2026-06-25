"use client";

import { useActionState, useState, useTransition } from "react";
import { CheckCircle2, MailCheck, Smartphone, UserRound } from "lucide-react";
import {
  updateProfileAction,
  startMobileVerificationAction,
  confirmMobileVerificationAction,
  type ProfileFormState,
} from "@/actions/profile";
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

interface ProfileData {
  firstName: string | null;
  lastName: string | null;
  email: string;
  emailVerified: boolean;
  mobile: string | null;
  mobileVerified: boolean;
  numberOfPropertiesManaged: number;
}

function Message({ state }: { state: ProfileFormState }) {
  if (state.success)
    return <p className="text-sm text-success">{state.success}</p>;
  if (state.error) return <p className="text-sm text-danger">{state.error}</p>;
  return null;
}

export function ProfileForm({ user }: { user: ProfileData }) {
  return (
    <div className="space-y-6">
      <DetailsCard user={user} />
      <EmailCard email={user.email} verified={user.emailVerified} />
      <MobileCard mobile={user.mobile} verified={user.mobileVerified} />
    </div>
  );
}

function DetailsCard({ user }: { user: ProfileData }) {
  const [state, action, pending] = useActionState<ProfileFormState, FormData>(
    updateProfileAction,
    {},
  );
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserRound className="h-5 w-5 text-primary" /> Your details
        </CardTitle>
        <CardDescription>Your name and how many properties you manage.</CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                name="firstName"
                defaultValue={user.firstName ?? ""}
                required
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                name="lastName"
                defaultValue={user.lastName ?? ""}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="numberOfPropertiesManaged">
              Number of properties managed
            </Label>
            <Input
              id="numberOfPropertiesManaged"
              name="numberOfPropertiesManaged"
              type="number"
              min={0}
              className="max-w-[12rem]"
              defaultValue={user.numberOfPropertiesManaged}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <Message state={state} />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function EmailCard({ email, verified }: { email: string; verified: boolean }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MailCheck className="h-5 w-5 text-accent" /> Email
        </CardTitle>
        <CardDescription>Used for sign-in and account recovery.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <Input value={email} disabled className="max-w-sm" />
          {verified ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> Verified
            </Badge>
          ) : (
            <Badge tone="warning">Not verified</Badge>
          )}
        </div>
        {!verified ? (
          <div className="space-y-2">
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
            {msg ? <p className="text-sm text-muted-foreground">{msg}</p> : null}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MobileCard({
  mobile,
  verified,
}: {
  mobile: string | null;
  verified: boolean;
}) {
  const [isVerified, setIsVerified] = useState(verified);
  const [step, setStep] = useState<"idle" | "codeSent">("idle");

  const [startState, startAction, startPending] = useActionState<
    ProfileFormState,
    FormData
  >(async (prev, fd) => {
    const res = await startMobileVerificationAction(prev, fd);
    if (res.success) setStep("codeSent");
    return res;
  }, {});

  const [confirmState, confirmAction, confirmPending] = useActionState<
    ProfileFormState,
    FormData
  >(async (prev, fd) => {
    const res = await confirmMobileVerificationAction(prev, fd);
    if (res.success) {
      setIsVerified(true);
      setStep("idle");
    }
    return res;
  }, {});

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5 text-primary" /> Mobile number
          {isVerified ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> Verified
            </Badge>
          ) : null}
        </CardTitle>
        <CardDescription>
          Verify your mobile for security alerts and account recovery.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isVerified ? (
          <div className="flex flex-wrap items-center gap-3">
            <Input value={mobile ?? ""} disabled className="max-w-xs" />
            <Button
              variant="ghost"
              onClick={() => {
                setIsVerified(false);
                setStep("idle");
              }}
            >
              Change number
            </Button>
          </div>
        ) : step === "idle" ? (
          <form action={startAction} className="flex flex-wrap items-end gap-2">
            <div>
              <Label htmlFor="mobile">Mobile number</Label>
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                placeholder="+447700900123"
                defaultValue={mobile ?? ""}
                className="w-56"
                required
              />
            </div>
            <Button type="submit" disabled={startPending}>
              {startPending ? "Sending…" : "Send code"}
            </Button>
            <Message state={startState} />
          </form>
        ) : (
          <div className="space-y-2">
            <form action={confirmAction} className="flex flex-wrap items-end gap-2">
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
              <Button type="submit" disabled={confirmPending}>
                {confirmPending ? "Verifying…" : "Verify"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep("idle")}
              >
                Use a different number
              </Button>
            </form>
            <Message state={confirmState} />
            <p className="text-xs text-muted-foreground">
              We sent a code to {mobile}. In development it's printed to the
              server console.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
