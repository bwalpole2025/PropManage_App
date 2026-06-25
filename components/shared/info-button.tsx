"use client";

import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCoachmarks } from "./coachmark-provider";

/** Re-opens a section's first-visit coachmark on demand. */
export function InfoButton({ section }: { section: string }) {
  const { reopen } = useCoachmarks();
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label="What's this?"
      title="What's this?"
      onClick={() => reopen(section)}
    >
      <Info className="h-4 w-4" />
    </Button>
  );
}
