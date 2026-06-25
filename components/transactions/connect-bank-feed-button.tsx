"use client";

import Link from "next/link";
import { Landmark } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/button";

/** Entry point to the open-banking consent flow. */
export function ConnectBankFeedButton({
  label = "Add bank feed",
  variant = "primary",
  className,
}: {
  label?: string;
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  return (
    <Link href="/transactions/connect">
      <Button variant={variant} className={className}>
        <Landmark className="h-4 w-4" /> {label}
      </Button>
    </Link>
  );
}
