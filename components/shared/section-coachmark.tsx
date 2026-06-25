"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, type LucideIcon } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useCoachmarks } from "./coachmark-provider";
import { COACHMARKS } from "./coachmark-content";

export interface CoachmarkStep {
  icon: LucideIcon;
  heading: string;
  bullets: string[];
}

/**
 * First-visit coachmark for a section. Auto-opens once (until dismissed), shows an
 * illustration + heading + bullets, and — for multi-step intros — dot pagination
 * with prev/next arrows. "Ok" dismisses once; "Don't show again" suppresses
 * permanently. Dismissals persist per user via the CoachmarkProvider.
 *
 * Takes only `section` (a string) so nothing non-serialisable crosses the
 * Server→Client boundary; the steps (with icon components) are resolved here.
 */
export function SectionCoachmark({ section }: { section: string }) {
  const { mounted, isDismissed, dismiss, forceOpen, clearForceOpen } =
    useCoachmarks();
  const [index, setIndex] = React.useState(0);

  const steps = COACHMARKS[section] ?? [];
  if (!steps.length) return null;

  const open = forceOpen === section || (mounted && !isDismissed(section));
  const step = steps[index];
  const Icon = step.icon;
  const multi = steps.length > 1;
  const isLast = index === steps.length - 1;

  function close(level: "ok" | "off") {
    setIndex(0);
    if (forceOpen === section) clearForceOpen();
    dismiss(section, level);
  }
  function next() {
    if (isLast) close("ok");
    else setIndex((i) => i + 1);
  }
  function prev() {
    setIndex((i) => Math.max(0, i - 1));
  }

  return (
    <Dialog open={open} onOpenChange={(v) => (!v ? close("ok") : undefined)}>
      <DialogContent>
        {/* Illustration */}
        <div className="mb-4 flex aspect-video items-center justify-center rounded-md bg-gradient-to-br from-primary/15 to-accent/15">
          <Icon className="h-12 w-12 text-primary/70" />
        </div>

        <DialogHeader>
          <DialogTitle>{step.heading}</DialogTitle>
        </DialogHeader>

        <ul className="space-y-2 text-sm text-muted-foreground">
          {step.bullets.map((b) => (
            <li key={b} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              <span>{b}</span>
            </li>
          ))}
        </ul>

        <DialogFooter className="mt-6 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {multi ? (
            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={prev}
                disabled={index === 0}
                aria-label="Previous step"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5">
                {steps.map((_, i) => (
                  <button
                    key={i}
                    type="button"
                    aria-label={`Go to step ${i + 1}`}
                    aria-current={i === index ? "step" : undefined}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-2 w-2 rounded-full transition-colors",
                      i === index ? "bg-primary" : "bg-muted hover:bg-muted-foreground/40",
                    )}
                  />
                ))}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={next}
                aria-label="Next step"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <span />
          )}

          <div className="flex items-center gap-2">
            <Button variant="ghost" onClick={() => close("off")}>
              Don&apos;t show again
            </Button>
            <Button onClick={next}>{multi && !isLast ? "Next" : "Ok"}</Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
