"use client";

import Link from "next/link";
import { HelpCircle, PlayCircle, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownLabel,
} from "@/components/ui/dropdown-menu";

/** Help dropdown for the Overview header. */
export function OverviewHelpMenu() {
  return (
    <DropdownMenu>
      <DropdownTrigger
        aria-label="Help"
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-foreground hover:bg-muted"
      >
        <HelpCircle className="h-4 w-4" />
      </DropdownTrigger>
      <DropdownContent align="end">
        <DropdownLabel>Get help</DropdownLabel>
        <Link
          href="/help"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <PlayCircle className="h-4 w-4" /> How-to videos
        </Link>
        <Link
          href="/help"
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <MessageCircle className="h-4 w-4" /> Contact support
        </Link>
      </DropdownContent>
    </DropdownMenu>
  );
}
