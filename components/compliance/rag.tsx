import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ComplianceRag, ComplianceRagLabel } from "@/lib/enums";
import type { ComplianceCategory } from "@/services/compliance";

type Tone = "success" | "warning" | "danger";

export const RAG_TONE: Record<ComplianceRag, Tone> = {
  GREEN: "success",
  AMBER: "warning",
  RED: "danger",
};

const DOT_BG: Record<ComplianceRag, string> = {
  GREEN: "bg-success",
  AMBER: "bg-warning",
  RED: "bg-danger",
};

/** A coloured traffic-light dot for a RAG status. */
export function RagDot({
  rag,
  className,
}: {
  rag: ComplianceRag;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn("inline-block h-2.5 w-2.5 shrink-0 rounded-full", DOT_BG[rag], className)}
    />
  );
}

/** A labelled RAG badge ("Action required" / "Action soon" / "Compliant"). */
export function RagBadge({
  rag,
  label,
  className,
}: {
  rag: ComplianceRag;
  label?: string;
  className?: string;
}) {
  return (
    <Badge tone={RAG_TONE[rag]} className={className}>
      <RagDot rag={rag} className="h-2 w-2" />
      {label ?? ComplianceRagLabel[rag]}
    </Badge>
  );
}

const CATEGORY_LABEL: Record<ComplianceCategory, string> = {
  certificates: "Certificates",
  tenancy: "Tenancy",
  registration: "Registration",
  hazards: "Hazards",
  pets: "Pets",
};

const CATEGORY_ORDER: ComplianceCategory[] = [
  "certificates",
  "tenancy",
  "registration",
  "hazards",
  "pets",
];

/** A compact row of per-category traffic lights for a property card. */
export function TrafficLights({
  categories,
  className,
}: {
  categories: Partial<Record<ComplianceCategory, ComplianceRag>>;
  className?: string;
}) {
  const present = CATEGORY_ORDER.filter((c) => categories[c]);
  if (present.length === 0) {
    return (
      <p className={cn("text-xs text-success", className)}>
        All categories compliant
      </p>
    );
  }
  return (
    <ul className={cn("flex flex-wrap gap-x-4 gap-y-1.5", className)}>
      {present.map((c) => (
        <li key={c} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <RagDot rag={categories[c]!} />
          {CATEGORY_LABEL[c]}
        </li>
      ))}
    </ul>
  );
}
