import {
  FileCheck2,
  CheckCircle2,
  Database,
  Send,
  FileSignature,
  AlertTriangle,
  ExternalLink,
  Lock,
  ListChecks,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getMtdOverview } from "@/services/mtd";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";

// Outbound HMRC / GOV.UK references (open in a new tab).
const HMRC = {
  register: "https://www.gov.uk/log-in-register-hmrc-online-services",
  signUp:
    "https://www.gov.uk/guidance/sign-up-for-making-tax-digital-for-income-tax",
  eligibility:
    "https://www.gov.uk/guidance/check-if-youre-eligible-for-making-tax-digital-for-income-tax",
  overview: "https://www.gov.uk/guidance/making-tax-digital-for-income-tax",
};

const STEPS: { n: number; title: string; icon: LucideIcon; points: string[] }[] =
  [
    {
      n: 1,
      title: "Keep digital records",
      icon: Database,
      points: [
        "Reconciled bank transactions",
        "Receipts",
        "Mortgage records",
        "Insurance records",
      ],
    },
    {
      n: 2,
      title: "Submit quarterly updates",
      icon: Send,
      points: [
        "View your income sources",
        "Submit quarterly updates",
        "View your tax calculation",
        "Let your accountant submit for you",
      ],
    },
    {
      n: 3,
      title: "Final Declaration",
      icon: FileSignature,
      points: [
        "Confirm your figures after the tax year",
        "Eventually replaces Self Assessment",
      ],
    },
  ];

/** Styled outbound link (always opens in a new tab). */
function ExternalAction({ href, children }: { href: string; children: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-4 text-sm font-medium hover:bg-muted"
    >
      {children}
      <ExternalLink className="h-3.5 w-3.5" />
    </a>
  );
}

export default async function MtdPage() {
  const ctx = await getActiveContext();
  const mtd = await getMtdOverview(ctx.entityId);
  const { hasFullAccess, connected } = mtd;

  return (
    <div className="space-y-6">
      <SectionCoachmark section="mtd" />
      <PageHeader
        title="Making Tax Digital"
        description="What MTD for Income Tax means for landlords — and how to get ready before connecting to HMRC."
        actions={
          connected ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> HMRC connected ({mtd.mode})
            </Badge>
          ) : hasFullAccess ? (
            <Button variant="outline" disabled>
              Connect to HMRC (soon)
            </Button>
          ) : (
            <Button variant="outline" disabled>
              <Lock className="h-4 w-4" /> Subscribe to connect
            </Button>
          )
        }
      />

      {/* Overview / education */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" /> From April 2026
          </CardTitle>
          <CardDescription>
            Making Tax Digital for Income Tax is changing how landlords report to
            HMRC.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-foreground">
            From <strong>April 2026</strong>, landlords whose combined property
            (and self-employment) income is over the threshold — currently{" "}
            <strong>£50,000 a year</strong> — must keep{" "}
            <strong>digital records</strong> and send{" "}
            <strong>quarterly updates</strong> to HMRC under Making Tax Digital
            (MTD) for Income Tax. Lower thresholds (£30,000, then £20,000) phase
            in over the following years.
          </p>
          <p className="text-sm text-muted-foreground">
            PropManage keeps your records in the right shape so you&apos;re ready
            to submit when MTD applies to you.{" "}
            <a
              href={HMRC.overview}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-primary hover:underline"
            >
              Read HMRC&apos;s MTD overview
            </a>
            .
          </p>
          <DisclaimerBanner text="MTD figures in PropManage are estimates derived from your records and are not tax advice." />
        </CardContent>
      </Card>

      {/* Three-step model */}
      <div className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">
          How MTD works — three steps
        </h2>
        <div className="grid gap-4 md:grid-cols-3">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <Card key={s.n}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                      {s.n}
                    </span>
                    <Icon className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <CardTitle className="mt-2 text-base">{s.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {s.points.map((p) => (
                      <li
                        key={p}
                        className="flex items-start gap-2 text-sm text-muted-foreground"
                      >
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Eligibility warning */}
      <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>
        <span className="font-medium">Not all landlords are eligible.</span> Some
        are exempt or excluded from MTD for Income Tax. Check whether it applies
        to you before signing up —{" "}
        <a
          href={HMRC.eligibility}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium underline"
        >
          HMRC eligibility &amp; exclusions list
        </a>
        .
      </Banner>

      {/* Prerequisites checklist */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" /> Before you connect —
            prerequisites
          </CardTitle>
          <CardDescription>
            Get these ready, then you can connect PropManage to HMRC.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium">
                  Have your Government Gateway login ready
                </p>
                <p className="text-sm text-muted-foreground">
                  You&apos;ll need your <strong>National Insurance number</strong>{" "}
                  plus your Government Gateway <strong>user ID and password</strong>.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" />
              <div>
                <p className="text-sm font-medium">
                  Sign up for MTD for Income Tax
                </p>
                <p className="text-sm text-muted-foreground">
                  Sign up in your Government Gateway account as an individual
                  before connecting.
                </p>
              </div>
            </li>
          </ul>
          <div className="flex flex-wrap gap-2">
            <ExternalAction href={HMRC.register}>
              Register for HMRC online services
            </ExternalAction>
            <ExternalAction href={HMRC.signUp}>
              Sign up for MTD as an individual
            </ExternalAction>
          </div>
        </CardContent>
      </Card>

      {/* Connect — gated behind an active subscription */}
      <Card>
        <CardHeader>
          <CardTitle>Connect to HMRC</CardTitle>
          <CardDescription>
            The final step once your prerequisites are in place.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasFullAccess ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                Your subscription is active — you can connect to HMRC and submit
                quarterly updates.
              </p>
              <Button variant="outline" disabled>
                Connect to HMRC (soon)
              </Button>
            </div>
          ) : (
            <Banner tone="info" icon={<Lock className="h-4 w-4" />}>
              Connecting to HMRC and submitting quarterly updates is part of a
              paid subscription. Education and prerequisites stay free.{" "}
              <a
                href="/settings/subscription"
                className="font-medium underline"
              >
                View plans
              </a>
              .
            </Banner>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
