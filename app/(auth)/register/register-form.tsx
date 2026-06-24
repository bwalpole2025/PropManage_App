"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { registerAction, type AuthFormState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input, Label, Select } from "@/components/ui/input";
import { LandlordType, LandlordTypeLabel } from "@/lib/enums";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function RegisterForm() {
  const [state, formAction] = useActionState<AuthFormState, FormData>(
    registerAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-4">
      <div>
        <Label htmlFor="name">Your name</Label>
        <Input id="name" name="name" required />
      </div>
      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
        />
      </div>
      <div>
        <Label htmlFor="entityName">Portfolio / business name</Label>
        <Input
          id="entityName"
          name="entityName"
          placeholder="e.g. Smith Property Portfolio"
          required
        />
      </div>
      <div>
        <Label htmlFor="entityType">Account type</Label>
        <Select id="entityType" name="entityType" defaultValue={LandlordType.INDIVIDUAL}>
          {Object.values(LandlordType).map((t) => (
            <option key={t} value={t}>
              {LandlordTypeLabel[t]}
            </option>
          ))}
        </Select>
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
