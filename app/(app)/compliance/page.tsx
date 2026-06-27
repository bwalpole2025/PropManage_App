import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Flame,
  PawPrint,
  BadgeCheck,
  BookOpen,
} from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getComplianceOverview } from "@/services/compliance";
import { getMilestoneTracker } from "@/services/compliance/milestones";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ComplianceRag } from "@/lib/enums";
import { cn } from "@/lib/utils";
import { RagBadge, RagDot, TrafficLights } from "@/components/compliance/rag";
import { MilestoneTracker } from "@/components/compliance/milestone-tracker";
import { CertificateUpload } from "@/components/compliance/certificate-upload";

export const dynamic = "force-dynamic";

const HEADLINE: Record<ComplianceRag, { title: string; tone: string; Icon: typeof ShieldCheck }> = {
  GREEN: {
    title: "Your portfolio is fully compliant",
    tone: "text-success",
    Icon: ShieldCheck,
  },
  AMBER: {
    title: "Action needed soon",
    tone: "text-warning-foreground",
    Icon: ShieldAlert,
  },
  RED: {
    title: "Compliance issues need your attention",
    tone: "text-danger",
    Icon: ShieldAlert,
  },
};

export default async function CompliancePage() {
  const ctx = await getActiveContext();
  const [overview, milestones] = await Promise.all([
    getComplianceOverview(ctx.entityId),
    getMilestoneTracker(ctx.entityId),
  ]);
  const head = HEADLINE[overview.rag];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Certificates, deposits, hazards and Renters' Rights Act 2025 obligations across your portfolio."
        actions={
          <Link
            href="/compliance/guide"
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
          >
            <BookOpen className="h-4 w-4" />
            Compliance guide
          </Link>
        }
      />

      {/* Global status indicator */}
      <Card>
        <CardContent className="flex flex-col gap-4 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "flex h-12 w-12 items-center justify-center rounded-full",
                overview.rag === ComplianceRag.GREEN ? "bg-success/15" : overview.rag === ComplianceRag.AMBER ? "bg-warning/20" : "bg-danger/15",
              )}
            >
              <head.Icon className={cn("h-6 w-6", head.tone)} />
            </span>
            <div>
              <p className={cn("text-lg font-semibold", head.tone)}>{head.title}</p>
              <p className="text-sm text-muted-foreground">
                {overview.isFullyCompliant
                  ? "Nothing requires action right now."
                  : `${overview.counts.red + overview.counts.amber} item${
                      overview.counts.red + overview.counts.amber === 1 ? "" : "s"
                    } need attention.`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <CountPill tone="danger" label="Critical" n={overview.counts.red} />
            <CountPill tone="warning" label="Soon" n={overview.counts.amber} />
            <CountPill tone="success" label="OK" n={overview.counts.green} />
          </div>
        </CardContent>
      </Card>

      {/* Time-sensitive milestones — date-driven regulatory clocks */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Time-sensitive milestones
        </h2>
        <MilestoneTracker cards={milestones} />
      </section>

      {/* Quick links to the managed areas */}
      <div className="grid gap-3 sm:grid-cols-3">
        <AreaLink href="/compliance/hazards" icon={Flame} title="Hazards & repairs" desc="Awaab's Law SLA tracking" />
        <AreaLink href="/compliance/pets" icon={PawPrint} title="Pet requests" desc="Respond within 28 days" />
        <AreaLink href="/compliance/registrations" icon={BadgeCheck} title="Registrations" desc="Ombudsman · PRSD · Right to Rent" />
      </div>

      {/* Needs attention */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Needs attention</h2>
        {overview.attention.length === 0 ? (
          <EmptyState
            icon={<ShieldCheck className="h-5 w-5" />}
            title="All clear"
            description="No compliance items are overdue or due soon."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y divide-border">
                {overview.attention.slice(0, 12).map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.href}
                      className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-muted/50"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <RagDot rag={item.rag} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{item.label}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.propertyLabel ?? "Portfolio-wide"} · {item.detail}
                          </p>
                        </div>
                      </div>
                      <RagBadge rag={item.rag} />
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Per-property RAG grid */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">By property</h2>
        {overview.properties.length === 0 ? (
          <EmptyState
            icon={<AlertTriangle className="h-5 w-5" />}
            title="No properties yet"
            description="Add a property to start tracking its compliance."
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {overview.properties.map((p) => (
              <Card key={p.propertyId}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-start justify-between gap-2">
                    <Link
                      href={`/properties/${p.propertyId}/compliance`}
                      className="truncate text-sm font-semibold hover:underline"
                    >
                      {p.propertyLabel}
                    </Link>
                    <RagBadge rag={p.rag} />
                  </div>
                  <TrafficLights categories={p.categories} />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Renew a certificate — drag & drop */}
      <section className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">Renew a certificate</h2>
        <CertificateUpload
          properties={overview.properties.map((p) => ({
            id: p.propertyId,
            label: p.propertyLabel,
          }))}
        />
      </section>
    </div>
  );
}

function CountPill({
  tone,
  label,
  n,
}: {
  tone: "danger" | "warning" | "success";
  label: string;
  n: number;
}) {
  const ring = {
    danger: "border-danger/30 text-danger",
    warning: "border-warning/40 text-warning-foreground",
    success: "border-success/30 text-success",
  }[tone];
  return (
    <div className={cn("flex flex-col items-center rounded-lg border px-4 py-2", ring)}>
      <span className="text-xl font-semibold">{n}</span>
      <span className="text-[11px] uppercase tracking-wide">{label}</span>
    </div>
  );
}

function AreaLink({
  href,
  icon: Icon,
  title,
  desc,
}: {
  href: string;
  icon: typeof Flame;
  title: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:border-primary/40 hover:bg-primary/5"
    >
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{desc}</p>
      </div>
    </Link>
  );
}
