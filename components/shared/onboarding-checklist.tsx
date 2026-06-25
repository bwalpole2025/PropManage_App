"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  Circle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  MailWarning,
  PartyPopper,
} from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChecklistStep {
  key: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
  /** Optional count pill next to the title, e.g. "3" rental transactions. */
  badge?: string;
}

const COLLAPSE_KEY = "pm.checklist.collapsed";

export function OnboardingChecklist({
  steps,
  emailUnverified = false,
}: {
  steps: ChecklistStep[];
  emailUnverified?: boolean;
}) {
  const completed = steps.filter((s) => s.done).length;
  const remaining = steps.length - completed;
  const allDone = remaining === 0;
  const activeIndex = steps.findIndex((s) => !s.done);

  // Collapsible — persisted (default expanded; SSR-safe mount guard).
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(COLLAPSE_KEY) === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);
  function toggle() {
    setCollapsed((v) => {
      const next = !v;
      try {
        localStorage.setItem(COLLAPSE_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2">
              {allDone ? (
                <PartyPopper className="h-5 w-5 shrink-0 text-success" />
              ) : null}
              {allDone
                ? "You've said goodbye to your spreadsheet."
                : `You're ${remaining} step${remaining === 1 ? "" : "s"} away from saying goodbye to your spreadsheet.`}
            </CardTitle>
            <CardDescription>
              {allDone
                ? "You're all set up — your books are live."
                : `Finish setup: ${completed} of ${steps.length} steps done.`}
            </CardDescription>
          </div>
          <button
            type="button"
            onClick={toggle}
            aria-expanded={!collapsed}
            aria-label={collapsed ? "Expand checklist" : "Collapse checklist"}
            className="shrink-0 rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            {collapsed ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </button>
        </div>
        {/* Progress stays visible even when collapsed. */}
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>

      {!collapsed ? (
        <CardContent className="flex flex-col gap-2">
          {emailUnverified ? (
            <Link
              href="/settings/security"
              className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning-foreground hover:bg-warning/20"
            >
              <MailWarning className="h-4 w-4 shrink-0" />
              Please verify your email address
              <ArrowRight className="ml-auto h-3.5 w-3.5" />
            </Link>
          ) : null}

          {steps.map((step, i) => {
            const isActive = i === activeIndex;
            return (
              <div
                key={step.key}
                className={cn(
                  "flex items-center gap-3 rounded-md border p-3",
                  step.done
                    ? "border-success/30 bg-success/5"
                    : isActive
                      ? "border-primary/40 bg-primary/5"
                      : "border-border",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
                    step.done
                      ? "bg-success text-success-foreground"
                      : "bg-muted text-muted-foreground",
                  )}
                >
                  {step.done ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 text-sm font-medium">
                    {step.title}
                    {step.badge ? (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold tabular-nums text-primary">
                        {step.badge}
                      </span>
                    ) : null}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
                {!step.done ? (
                  <Link
                    href={step.href}
                    className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {step.cta}
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-success">Done</span>
                )}
              </div>
            );
          })}
        </CardContent>
      ) : null}
    </Card>
  );
}
