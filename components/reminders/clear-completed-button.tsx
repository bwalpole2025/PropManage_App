"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eraser } from "lucide-react";
import { clearCompletedRemindersAction } from "@/actions/reminder";
import { Button } from "@/components/ui/button";

/** "Clear" action — deletes all completed reminders. */
export function ClearCompletedButton({ disabled }: { disabled?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function clear() {
    startTransition(async () => {
      await clearCompletedRemindersAction();
      router.refresh();
    });
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={clear}
      disabled={disabled || pending}
    >
      <Eraser className="h-4 w-4" /> {pending ? "Clearing…" : "Clear"}
    </Button>
  );
}
