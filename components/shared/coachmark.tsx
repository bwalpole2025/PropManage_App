"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useCoachmark } from "@/lib/hooks/use-coachmark";

/**
 * First-visit onboarding coachmark for a section. Shows once per `storageKey`;
 * the "Don't show again" action persists the dismissal via useCoachmark.
 *
 *   <Coachmark storageKey="transactions" title="Categorise your transactions">
 *     Tag each transaction to an SA105 box to power your tax estimate.
 *   </Coachmark>
 */
export function Coachmark({
  storageKey,
  title,
  children,
}: {
  storageKey: string;
  title: string;
  children: React.ReactNode;
}) {
  const { open, dismiss } = useCoachmark(storageKey);

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? dismiss() : undefined)}>
      <DialogContent>
        <DialogHeader>
          <span className="mb-1 flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{children}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button onClick={dismiss}>Got it</Button>
          <Button variant="ghost" onClick={dismiss}>
            Don&apos;t show again
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
