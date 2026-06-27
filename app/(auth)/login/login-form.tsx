"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthFormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function SubmitButton({ twoFactor }: { twoFactor: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending
        ? "Signing in…"
        : twoFactor
          ? "Verify & sign in"
          : "Sign in"}
    </Button>
  );
}

// Pre-fill demo credentials in development only — never in production.
const demo = process.env.NODE_ENV !== "production";

export function LoginForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    loginAction,
    {},
  );
  const twoFactor = !!state.twoFactorRequired;

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={demo ? "landlord@example.com" : undefined}
          required
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          defaultValue={demo ? "Password123!" : undefined}
          required
        />
      </div>
      {twoFactor ? (
        <div>
          <Label htmlFor="code">Authenticator code</Label>
          <Input
            id="code"
            name="code"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            autoComplete="one-time-code"
            placeholder="6-digit code"
            autoFocus
            required
          />
          <p className="mt-1 text-xs text-muted-foreground">
            Enter the 6-digit code from your authenticator app.
          </p>
        </div>
      ) : null}
      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton twoFactor={twoFactor} />
    </form>
  );
}
