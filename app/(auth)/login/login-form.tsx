"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { loginAction, type AuthFormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
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
      {state.error ? (
        <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
