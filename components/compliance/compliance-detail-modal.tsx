"use client";

import * as React from "react";
import {
  Scale,
  ClipboardCheck,
  CalendarClock,
  Gavel,
  BookOpen,
  ExternalLink,
  AlertTriangle,
  ScrollText,
  Banknote,
  Search,
  ListChecks,
  CheckCircle2,
} from "lucide-react";
import type { ComplianceRegulation } from "@/lib/compliance/complianceData";
import { enforcementFor } from "@/lib/compliance/enforcement";
import { ComplianceRag } from "@/lib/enums";
import { Dialog, DialogContent, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { RagBadge } from "@/components/compliance/rag";
import { ComplianceMarkdown } from "@/components/compliance/compliance-markdown";
import { cn } from "@/lib/utils";

// The landlord-facing status for a regulation card. `upcoming_duty` is only ever
// an auto-computed value (a future obligation); the manual selector toggles
// between Compliant and Action required.
export type RegulationStatus = "compliant" | "action_required" | "upcoming_duty";

export const STATUS_RAG: Record<RegulationStatus, ComplianceRag> = {
  compliant: ComplianceRag.GREEN,
  action_required: ComplianceRag.RED,
  upcoming_duty: ComplianceRag.AMBER,
};

export const STATUS_LABEL: Record<RegulationStatus, string> = {
  compliant: "Compliant",
  action_required: "Action required",
  upcoming_duty: "Upcoming duty",
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export interface ComplianceDetailModalProps {
  regulation: ComplianceRegulation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Effective status shown in the header. */
  status: RegulationStatus;
  /** Whether the status is auto-tracked (computed) vs a manual override. */
  auto: boolean;
  /** Set a manual Compliant / Action-required status (implies auto = false). */
  onStatusChange: (status: "compliant" | "action_required") => void;
  /** Toggle auto-tracking; re-enabling reverts to the computed default status. */
  onAutoChange: (auto: boolean) => void;
  /** ISO date the action was last completed. */
  lastCompletedAt?: string | null;
  /** ISO date the next renewal falls due. */
  nextDueAt?: string | null;
  /** Log a completed inspection/action — persists + resets the renewal timeline. */
  onLogCompleted: () => void | Promise<void>;
  /** True while the log action is in flight. */
  logging?: boolean;
}

/**
 * Detail view for a single compliance regulation card. Reuses the app Dialog as
 * a wide, scrollable modal: sticky header (title + status selector + governing
 * legislation), a blockquote "must-do" callout, the rich markdown breakdown,
 * an "Official Resources & Enforcement" section, and a sticky action footer.
 */
export function ComplianceDetailModal({
  regulation,
  open,
  onOpenChange,
  status,
  auto,
  onStatusChange,
  onAutoChange,
  lastCompletedAt,
  nextDueAt,
  onLogCompleted,
  logging = false,
}: ComplianceDetailModalProps) {
  const enforcement = enforcementFor(regulation.id);
  const titleId = `compliance-${regulation.id}-title`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-labelledby={titleId}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden p-0 text-left"
      >
        <DialogClose onClose={() => onOpenChange(false)} />

        {/* ---------------------------------------------------------------- */}
        {/* 1. Header: title, status selector, governing legislation         */}
        {/* ---------------------------------------------------------------- */}
        <header className="border-b border-border px-6 pb-5 pt-6">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {regulation.category}
          </p>
          <h2 id={titleId} className="mt-1 pr-8 text-xl font-semibold leading-tight">
            {regulation.title}
          </h2>

          {/* Status selector — auto-track or manual Compliant/Action required */}
          <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2">
            <RagBadge rag={STATUS_RAG[status]} label={STATUS_LABEL[status]} />
            <div
              role="group"
              aria-label="Set compliance status"
              className="inline-flex rounded-full border border-border p-0.5"
            >
              {(["compliant", "action_required"] as const).map((s) => {
                const active = !auto && status === s;
                return (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={active}
                    disabled={auto}
                    onClick={() => onStatusChange(s)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                      active
                        ? s === "compliant"
                          ? "bg-success text-white"
                          : "bg-danger text-danger-foreground"
                        : "text-muted-foreground hover:text-foreground",
                      auto && "cursor-not-allowed opacity-50 hover:text-muted-foreground",
                    )}
                  >
                    {STATUS_LABEL[s]}
                  </button>
                );
              })}
            </div>
            <label className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
              <Switch checked={auto} onCheckedChange={onAutoChange} aria-label="Auto-track status" />
              Auto-track
            </label>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-md bg-muted/50 px-3 py-2 text-sm">
            <Scale className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              Governing legislation:{" "}
              <span className="font-semibold text-foreground">{regulation.legalReference}</span>
            </p>
          </div>
        </header>

        {/* ---------------------------------------------------------------- */}
        {/* Scrollable body                                                  */}
        {/* ---------------------------------------------------------------- */}
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          {/* 2. Summary callout — blockquote "must-do" constraint */}
          <blockquote className="rounded-r-md border-l-4 border-primary bg-primary/5 px-4 py-3">
            <p className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <ClipboardCheck className="h-3.5 w-3.5" /> The must-do
            </p>
            <p className="text-sm font-medium text-foreground">{regulation.keyRequirement}</p>
          </blockquote>

          {/* 2b. Summary — what the regulation is and who it applies to */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Summary</h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {regulation.summary}
            </p>
          </section>

          {/* 2c. Key points for landlords — the actionable checklist */}
          <section>
            <h3 className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ListChecks className="h-4 w-4 text-primary" /> Key points for landlords
            </h3>
            <ul className="space-y-2">
              {regulation.keyPoints.map((point, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  <span>{point}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* 3. Detailed breakdown — rich markdown with statutory citations */}
          <section>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Detailed breakdown</h3>
            <ComplianceMarkdown source={regulation.detailedInfo} />
          </section>

          {/* 4. Official Resources & Enforcement */}
          <section className="rounded-lg border border-border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold text-foreground">
              Official Resources &amp; Enforcement
            </h3>

            <div className="mt-3 flex items-start gap-2 text-sm">
              <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <p className="text-muted-foreground">
                Governed by{" "}
                <span className="font-semibold text-foreground">{enforcement.governingBody}</span>.
              </p>
            </div>

            <div className="mt-3 rounded-md border border-danger/30 bg-danger/5 p-3">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-danger">
                <AlertTriangle className="h-3.5 w-3.5" /> If you don&apos;t comply
              </p>
              <ul className="mt-1.5 space-y-1">
                {enforcement.consequences.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span aria-hidden className="text-danger">•</span>
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-3">
              <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <BookOpen className="h-3.5 w-3.5" /> Official guidance
              </p>
              <ul className="mt-1.5 space-y-1">
                {enforcement.resources.map((r) => (
                  <li key={r.href}>
                    <a
                      href={r.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                    >
                      {r.label}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* References & Further Reading — citations, enforcement + penalty, inquiries */}
          <section className="rounded-lg border border-border p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <BookOpen className="h-4 w-4 text-muted-foreground" /> References &amp; Further
              Reading
            </h3>

            {/* 1. Statutory citations */}
            <div className="mt-3">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <ScrollText className="h-3.5 w-3.5" /> Statutory citations
              </p>
              <ul className="mt-1.5 space-y-1">
                {enforcement.statutoryCitations.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-foreground">
                    <span aria-hidden className="font-semibold text-muted-foreground">
                      §
                    </span>
                    <span className="font-medium">{c}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* 2. Enforcement body + maximum penalty */}
            <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
              <p className="flex items-start gap-1.5 text-muted-foreground">
                <Gavel className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Enforced by{" "}
                  <span className="font-semibold text-foreground">
                    {enforcement.governingBody}
                  </span>
                  .
                </span>
              </p>
              <p className="mt-1.5 flex items-start gap-1.5 text-muted-foreground">
                <Banknote className="mt-0.5 h-4 w-4 shrink-0 text-danger" />
                <span>
                  Maximum penalty:{" "}
                  <span className="font-semibold text-foreground">{enforcement.maxPenalty}</span>
                </span>
              </p>
            </div>

            {/* 3. Further inquiry prompts */}
            <div className="mt-3">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Search className="h-3.5 w-3.5" /> Make an official inquiry
              </p>
              <ul className="mt-1.5 space-y-1">
                {enforcement.furtherInquiries.map((q, i) =>
                  q.href ? (
                    <li key={i}>
                      <a
                        href={q.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-primary underline underline-offset-2 hover:text-primary/80"
                      >
                        {q.label}
                        <ExternalLink className="h-3 w-3 shrink-0" />
                      </a>
                    </li>
                  ) : (
                    <li key={i} className="flex gap-2 text-sm text-muted-foreground">
                      <span aria-hidden className="text-primary">
                        →
                      </span>
                      <span>{q.label}</span>
                    </li>
                  ),
                )}
              </ul>
            </div>
          </section>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* 5. Action footer                                                 */}
        {/* ---------------------------------------------------------------- */}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-6 py-4">
          <div className="text-xs text-muted-foreground">
            {lastCompletedAt && (
              <div>
                Last completed:{" "}
                <span className="font-medium text-foreground">{formatDate(lastCompletedAt)}</span>
              </div>
            )}
            {nextDueAt ? (
              <div className="flex items-center gap-1">
                <CalendarClock className="h-3 w-3" /> Next due:{" "}
                <span className="font-medium text-foreground">{formatDate(nextDueAt)}</span>
              </div>
            ) : (
              !lastCompletedAt && <span>No renewal logged yet.</span>
            )}
          </div>
          <Button onClick={() => void onLogCompleted()} disabled={logging}>
            <ClipboardCheck className="h-4 w-4" />
            {logging ? "Saving…" : "Log Completed Inspection / Action"}
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}
