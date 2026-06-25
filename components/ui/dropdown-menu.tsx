"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (v: boolean) => void;
}
const DropdownContext = React.createContext<DropdownContextValue | null>(null);
function useDropdown() {
  const ctx = React.useContext(DropdownContext);
  if (!ctx) throw new Error("Dropdown parts must be used within <DropdownMenu>");
  return ctx;
}

/** Lightweight menu: trigger + overlay click-catcher + absolute panel. */
export function DropdownMenu({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return (
    <DropdownContext.Provider value={{ open, setOpen }}>
      <div className={cn("relative", className)}>{children}</div>
    </DropdownContext.Provider>
  );
}

export function DropdownTrigger({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, setOpen } = useDropdown();
  return (
    <button
      type="button"
      aria-haspopup="menu"
      aria-expanded={open}
      onClick={() => setOpen(!open)}
      className={className}
    >
      {children}
    </button>
  );
}

export function DropdownContent({
  align = "start",
  className,
  children,
}: {
  align?: "start" | "end";
  className?: string;
  children: React.ReactNode;
}) {
  const { open, setOpen } = useDropdown();
  if (!open) return null;
  return (
    <>
      <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} aria-hidden />
      <div
        role="menu"
        className={cn(
          "absolute z-20 mt-1 min-w-[12rem] overflow-hidden rounded-md border border-border bg-card shadow-lg",
          align === "end" ? "right-0" : "left-0",
          className,
        )}
      >
        {children}
      </div>
    </>
  );
}

export function DropdownItem({
  className,
  onSelect,
  children,
  ...props
}: React.HTMLAttributes<HTMLButtonElement> & { onSelect?: () => void }) {
  const { setOpen } = useDropdown();
  return (
    <button
      type="button"
      role="menuitem"
      onClick={() => {
        onSelect?.();
        setOpen(false);
      }}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

export function DropdownLabel({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn(
        "px-3 pb-1 pt-2 text-xs font-medium uppercase tracking-wide text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border" />;
}
