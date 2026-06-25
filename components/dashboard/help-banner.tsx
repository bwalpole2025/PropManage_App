"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Banner } from "@/components/ui/banner";
import { useCoachmark } from "@/lib/hooks/use-coachmark";

/** Dismissible "join a live tutorial" banner (persists via localStorage). */
export function HelpBanner() {
  const { open, dismiss } = useCoachmark("overview-help");
  if (!open) return null;
  return (
    <Banner
      tone="info"
      icon={<GraduationCap className="h-4 w-4" />}
      onDismiss={dismiss}
    >
      Need help getting started?{" "}
      <Link href="/help" className="font-medium underline underline-offset-2">
        Join a live tutorial
      </Link>{" "}
      to see PropManage in action.
    </Banner>
  );
}
