"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import {
  Search,
  X,
  ShieldCheck,
  FileSignature,
  Wrench,
  Gavel,
  Landmark,
  ChevronRight,
  Clock,
  Scale,
  BookOpen,
  type LucideIcon,
} from "lucide-react";
import {
  complianceRegulations,
  REGULATION_CATEGORIES,
  type ComplianceRegulation,
  type RegulationCategory,
} from "@/lib/compliance/complianceData";
import { SearchInput } from "@/components/ui/search-input";
import { cn } from "@/lib/utils";
import { MiniMarkdown } from "./mini-markdown";

// An educational, read-first repository of the landlord regulations. Deliberately
// styled on a calm slate canvas with indigo accents (distinct from the app's
// operational green) to signal "reference library", and built to be scannable:
// search across every field, filter by lifecycle category, and open a card into a
// right-hand drawer for the full write-up.

type Filter = "All" | RegulationCategory;

const CATEGORY_ICON: Record<RegulationCategory, LucideIcon> = {
  "Pre-Let Safety": ShieldCheck,
  "Tenancy Setup": FileSignature,
  "During Tenancy": Wrench,
  Possession: Gavel,
  "Tax & Registration": Landmark,
};

/** Primary act name only (drops the trailing "(...)" and any secondary refs). */
function shortLegalRef(legalReference: string): string {
  return legalReference
    .split(";")[0]
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .trim();
}

/** Lowercased haystack across every field so keyword search is comprehensive. */
function haystack(reg: ComplianceRegulation): string {
  return `${reg.title} ${reg.keyRequirement} ${reg.legalReference} ${reg.category} ${reg.detailedInfo}`.toLowerCase();
}

export function LandlordInfoTab({
  regulations = complianceRegulations,
}: {
  regulations?: ComplianceRegulation[];
}) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("All");
  const [selected, setSelected] = React.useState<ComplianceRegulation | null>(null);

  const results = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return regulations.filter((reg) => {
      if (filter !== "All" && reg.category !== filter) return false;
      if (q && !haystack(reg).includes(q)) return false;
      return true;
    });
  }, [regulations, query, filter]);

  return (
    <div className="text-slate-700">
      {/* Search + category filter */}
      <div className="space-y-4">
        <SearchInput
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery("")}
          placeholder="Search regulations — e.g. mould, deposit, eviction, EPC…"
          aria-label="Search landlord regulations"
          className="border-slate-200 bg-white text-slate-700 focus-visible:ring-indigo-500 [&::-webkit-search-cancel-button]:appearance-none"
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter by category">
          {(["All", ...REGULATION_CATEGORIES] as Filter[]).map((c) => {
            const active = filter === c;
            const Icon = c === "All" ? BookOpen : CATEGORY_ICON[c];
            return (
              <button
                key={c}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(c)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                  active
                    ? "border-indigo-600 bg-indigo-600 text-white shadow-sm"
                    : "border-slate-200 bg-white text-slate-600 hover:border-indigo-300 hover:text-indigo-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {c}
              </button>
            );
          })}
        </div>
      </div>

      {/* Result count */}
      <p className="mt-5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {results.length} {results.length === 1 ? "regulation" : "regulations"}
        {query ? ` matching “${query}”` : ""}
      </p>

      {/* Card grid */}
      {results.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-10 text-center">
          <Search className="mx-auto h-6 w-6 text-slate-300" />
          <p className="mt-3 text-sm font-medium text-slate-600">No regulations found</p>
          <p className="mt-1 text-sm text-slate-400">
            Try another keyword or clear the filters.
          </p>
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((reg) => (
            <InfoCard key={reg.id} reg={reg} onOpen={() => setSelected(reg)} />
          ))}
        </div>
      )}

      {/* Slide-in detail drawer */}
      <InfoDrawer reg={selected} onClose={() => setSelected(null)} />
    </div>
  );
}

function InfoCard({
  reg,
  onOpen,
}: {
  reg: ComplianceRegulation;
  onOpen: () => void;
}) {
  const Icon = CATEGORY_ICON[reg.category];
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group flex h-full flex-col rounded-xl border border-slate-200 bg-white p-5 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:border-indigo-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
        <Icon className="h-3.5 w-3.5" />
        {reg.category}
      </div>

      <h3 className="mt-2 text-base font-semibold leading-snug text-slate-900">
        {reg.title}
      </h3>

      <span className="mt-2 inline-flex w-fit items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        <Scale className="h-3 w-3" />
        {shortLegalRef(reg.legalReference)}
      </span>

      <p className="mt-3 line-clamp-3 text-sm text-slate-600">{reg.keyRequirement}</p>

      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-indigo-600 group-hover:gap-1.5">
        Read more
        <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

/** Right-anchored slide-in drawer with the full regulation write-up. */
function InfoDrawer({
  reg,
  onClose,
}: {
  reg: ComplianceRegulation | null;
  onClose: () => void;
}) {
  const [mounted, setMounted] = React.useState(false);
  const [shown, setShown] = React.useState(false);
  const open = reg != null;

  React.useEffect(() => setMounted(true), []);

  // Lock body scroll + Escape-to-close while open.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  // Trigger the slide-in on the frame after mount.
  React.useEffect(() => {
    if (!open) {
      setShown(false);
      return;
    }
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, [open]);

  if (!mounted || !open || !reg) return null;
  const Icon = CATEGORY_ICON[reg.category];

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity duration-200",
          shown ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={reg.title}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-lg flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          shown ? "translate-x-0" : "translate-x-full",
        )}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-6 py-5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-indigo-600">
              <Icon className="h-3.5 w-3.5" />
              {reg.category}
            </div>
            <h2 className="mt-1.5 text-lg font-semibold leading-tight text-slate-900">
              {reg.title}
            </h2>
            <div className="mt-2 flex items-start gap-1.5 text-sm text-slate-500">
              <Scale className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{reg.legalReference}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="rounded-lg border border-indigo-100 bg-indigo-50/60 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700">
              Key requirement
            </p>
            <p className="mt-1 text-sm text-slate-700">{reg.keyRequirement}</p>
          </div>

          <div className="mt-3 flex items-start gap-1.5 text-sm text-slate-600">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" />
            <span>
              <span className="font-medium text-slate-800">Timeline: </span>
              {reg.timeline}
            </span>
          </div>

          <hr className="my-4 border-slate-200" />

          {/* The slate prose tints below override MiniMarkdown's defaults. */}
          <MiniMarkdown
            source={reg.detailedInfo}
            className="text-slate-600 [&_a]:text-indigo-600 [&_h4]:text-slate-900 [&_strong]:text-slate-900"
          />

          <p className="mt-6 text-xs text-slate-400">
            General information, not legal or tax advice — always check the linked
            official guidance.
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}
