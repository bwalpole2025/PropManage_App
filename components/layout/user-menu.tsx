"use client";

import { useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { logoutAction } from "@/actions/auth";

export function UserMenu({
  name,
  email,
}: {
  name?: string | null;
  email?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const initials = (name ?? email ?? "?")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary hover:bg-primary/20"
        aria-label="Account menu"
      >
        {initials}
      </button>
      {open ? (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-md border border-border bg-card shadow-lg">
            <div className="border-b border-border px-3 py-2">
              <p className="truncate text-sm font-medium">{name ?? "User"}</p>
              <p className="truncate text-xs text-muted-foreground">{email}</p>
            </div>
            <a
              href="/settings"
              className="flex items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
            >
              <UserIcon className="h-4 w-4" /> Profile & settings
            </a>
            <form action={logoutAction}>
              <button
                type="submit"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger hover:bg-muted"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </form>
          </div>
        </>
      ) : null}
    </div>
  );
}
