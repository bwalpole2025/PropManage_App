import Link from "next/link";
import { AlertTriangle, Calculator, ShieldCheck } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getDashboardData } from "@/services/dashboard";
import { PageHeader } from "@/components/shared/page-header";
import { DashboardKpis } from "./dashboard-kpis";
import { OnboardingChecklist } from "@/components/shared/onboarding-checklist";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { ReminderBadge } from "@/components/shared/reminder-badge";
import { CurrencyValue } from "@/components/shared/currency-value";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatPenceCompact, formatDate } from "@/lib/format";
import { ComplianceTypeLabel } from "@/lib/enums";

export default async function DashboardPage() {
  const ctx = await getActiveContext();
  const data = await getDashboardData(ctx.entityId, ctx.user.id);

  const steps = [
    {
      key: "property",
      title: "Add a property",
      description: "Tell us about your first rental property.",
      href: "/properties/new",
      cta: "Add property",
      done: data.onboarding.hasProperty,
    },
    {
      key: "tenancy",
      title: "Add a tenancy",
      description: "Record the tenant, rent and frequency.",
      href: "/properties",
      cta: "Add tenancy",
      done: data.onboarding.hasTenancy,
    },
    {
      key: "transaction",
      title: "Track a rental transaction",
      description: "Log rent received or an expense.",
      href: "/transactions/new",
      cta: "Add transaction",
      done: data.onboarding.hasTransaction,
      badge: data.onboarding.transactionCount
        ? String(data.onboarding.transactionCount)
        : undefined,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={`Overview for ${ctx.entityName} · tax year ${data.taxYear}`}
      />

      {/* KPI tiles — client-rendered via tRPC + TanStack Query */}
      <DashboardKpis />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Onboarding + alerts */}
        <div className="space-y-6 lg:col-span-2">
          <OnboardingChecklist
            steps={steps}
            emailUnverified={data.onboarding.emailUnverified}
          />

          {/* Missing-rent / arrears */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Missing rent &amp; arrears</CardTitle>
                <CardDescription>
                  Expected rent that hasn&apos;t fully arrived.
                </CardDescription>
              </div>
              <AlertTriangle className="h-5 w-5 text-warning-foreground" />
            </CardHeader>
            <CardContent>
              {data.arrears.length === 0 ? (
                <EmptyState
                  icon={<ShieldCheck className="h-5 w-5" />}
                  title="No arrears"
                  description="Every active tenancy is up to date."
                />
              ) : (
                <ul className="divide-y divide-border">
                  {data.arrears.map((a) => (
                    <li
                      key={a.tenancyId + a.dueDate.toISOString()}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {a.propertyLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {a.tenantName} · due {formatDate(a.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge
                          tone={a.status === "OVERDUE" ? "danger" : "warning"}
                        >
                          {a.status}
                        </Badge>
                        <CurrencyValue
                          pence={a.shortfallPence}
                          tone="expense"
                          className="text-sm font-semibold"
                        />
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right rail: tax snapshot + compliance */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Tax estimate</CardTitle>
                <CardDescription>SA105 basis · {data.taxYear}</CardDescription>
              </div>
              <Calculator className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground">
                  Estimated tax
                </p>
                <p className="text-2xl font-semibold tabular-nums text-primary">
                  {formatPenceCompact(data.tax.estimatedTaxPence)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  on taxable profit of{" "}
                  {formatPenceCompact(data.tax.taxableProfitPence)}
                </p>
              </div>
              <DisclaimerBanner />
              <Link
                href="/tax"
                className="block text-sm font-medium text-primary hover:underline"
              >
                View full tax breakdown →
              </Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <div>
                <CardTitle>Compliance reminders</CardTitle>
                <CardDescription>Certificates due soon</CardDescription>
              </div>
              <ShieldCheck className="h-5 w-5 text-accent" />
            </CardHeader>
            <CardContent>
              {data.compliance.length === 0 ? (
                <EmptyState
                  title="Nothing due"
                  description="No certificates expiring in the next 45 days."
                />
              ) : (
                <ul className="space-y-3">
                  {data.compliance.map((c) => (
                    <li key={c.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {ComplianceTypeLabel[
                            c.type as keyof typeof ComplianceTypeLabel
                          ] ?? c.type}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {c.propertyLabel ?? "Portfolio-wide"}
                        </p>
                      </div>
                      <ReminderBadge date={c.expiryDate} />
                    </li>
                  ))}
                </ul>
              )}
              <Link
                href="/files"
                className="mt-4 block text-sm font-medium text-primary hover:underline"
              >
                All files &amp; dates →
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
