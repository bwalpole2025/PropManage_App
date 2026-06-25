"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Landmark } from "lucide-react";
import { connectBankFeedAction } from "@/actions/bank";
import { Button, type ButtonProps } from "@/components/ui/button";

export function ConnectBankFeedButton({
  label = "Add bank feed",
  variant = "primary",
  className,
}: {
  label?: string;
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={variant}
      className={className}
      disabled={pending}
      onClick={() =>
        start(async () => {
          await connectBankFeedAction();
          router.refresh();
        })
      }
    >
      <Landmark className="h-4 w-4" /> {pending ? "Connecting…" : label}
    </Button>
  );
}
