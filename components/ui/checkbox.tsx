"use client";

import { Check, Minus } from "lucide-react";
import { cn } from "@/lib/utils";

export interface CheckboxProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  indeterminate?: boolean;
  disabled?: boolean;
  "aria-label"?: string;
}

/** Accessible tri-state checkbox (role="checkbox"). */
export function Checkbox({
  checked,
  onCheckedChange,
  indeterminate,
  disabled,
  ...aria
}: CheckboxProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? "mixed" : checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      {...aria}
      className={cn(
        "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-50",
        checked || indeterminate
          ? "border-primary bg-primary text-primary-foreground"
          : "border-input bg-card",
      )}
    >
      {indeterminate ? (
        <Minus className="h-3 w-3" />
      ) : checked ? (
        <Check className="h-3 w-3" />
      ) : null}
    </button>
  );
}
