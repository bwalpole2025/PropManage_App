import Link from "next/link";
import { Check, Circle, ArrowRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChecklistStep {
  key: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
}

export function OnboardingChecklist({ steps }: { steps: ChecklistStep[] }) {
  const completed = steps.filter((s) => s.done).length;
  const allDone = completed === steps.length;
  // First not-done step is the "active" one to nudge.
  const activeIndex = steps.findIndex((s) => !s.done);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Goodbye to spreadsheets</CardTitle>
        <CardDescription>
          {allDone
            ? "You're all set up — your books are live."
            : `Finish setup: ${completed} of ${steps.length} steps done.`}
        </CardDescription>
        <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(completed / steps.length) * 100}%` }}
          />
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
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
                <p className="text-sm font-medium">{step.title}</p>
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
    </Card>
  );
}
