import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Scale, Clock, Check, ListChecks } from "lucide-react";
import {
  getRegulationById,
  type RegulationDefaultStatus,
} from "@/lib/compliance/complianceData";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { MiniMarkdown } from "@/components/compliance/mini-markdown";

const STATUS: Record<
  RegulationDefaultStatus,
  { label: string; tone: "success" | "danger" | "warning" }
> = {
  compliant: { label: "Compliant", tone: "success" },
  action_required: { label: "Action required", tone: "danger" },
  upcoming_duty: { label: "Upcoming duty", tone: "warning" },
};

export default async function RegulationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const reg = getRegulationById(id);
  if (!reg) notFound();
  const status = STATUS[reg.defaultStatus];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/compliance/guide"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to compliance guide
      </Link>

      {/* Title block */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            {reg.category}
          </span>
          <Badge tone={status.tone}>{status.label}</Badge>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{reg.title}</h1>
        <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
          <Scale className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{reg.legalReference}</span>
        </div>
      </div>

      <p className="text-base leading-relaxed text-muted-foreground">
        {reg.summary}
      </p>

      {/* Key requirement */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Key requirement
          </p>
          <p className="mt-1 text-sm text-foreground">{reg.keyRequirement}</p>
        </CardContent>
      </Card>

      {/* Key points checklist */}
      <section className="space-y-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <ListChecks className="h-4 w-4 text-primary" />
          Key points for landlords
        </h2>
        <ul className="space-y-2">
          {reg.keyPoints.map((point, i) => (
            <li
              key={i}
              className="flex items-start gap-2.5 rounded-lg border border-border bg-card p-3 text-sm"
            >
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              <span>{point}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Timeline */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-sm">
        <Clock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <span>
          <span className="font-medium text-foreground">Timeline: </span>
          {reg.timeline}
        </span>
      </div>

      {/* Full deep-dive */}
      <section className="space-y-3">
        <h2 className="text-sm font-semibold">Full guidance</h2>
        <MiniMarkdown source={reg.detailedInfo} />
      </section>

      <p className="border-t border-border pt-4 text-xs text-muted-foreground/80">
        General information, not legal or tax advice — always check the linked
        official guidance.
      </p>
    </div>
  );
}
