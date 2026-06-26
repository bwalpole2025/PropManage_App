import Link from "next/link";
import {
  FileCheck2,
  CheckCircle2,
  Clock,
  AlertCircle,
  ShieldCheck,
  UserCog,
} from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { MembershipRole } from "@/lib/enums";
import { getMtdOverview, compilePeriodSummary } from "@/services/mtd";
import { PageHeader } from "@/components/shared/page-header";
import { SectionCoachmark } from "@/components/shared/section-coachmark";
import { DisclaimerBanner } from "@/components/shared/disclaimer-banner";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { formatDate, relativeDays } from "@/lib/format";
import { ConnectHmrcButton } from "@/components/mtd/connect-hmrc-button";
import { NinoForm } from "@/components/mtd/nino-form";
import { HmrcSubmitDialog, type SubmitSummary } from "@/components/mtd/hmrc-submit-dialog";
import { CalculationCard } from "@/components/mtd/calculation-card";
import { RefreshObligations } from "@/components/mtd/refresh-obligations";

export default async function MtdPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const sp = await searchParams;
  const ctx = await getActiveContext();
  const mtd = await getMtdOverview(ctx.entityId);
  const canSubmit = can(ctx.role, Capability.SUBMIT_MTD);
  const isAgent = ctx.role === MembershipRole.ACCOUNTANT;

  // Pre-compile the period figure for each OPEN quarterly obligation so the
  // confirmation dialog can show exactly what would be filed.
  const openQuarters = mtd.obligations.filter(
    (o) => o.type === "QUARTERLY_UPDATE" && o.status === "OPEN",
  );
  const summaries = new Map<string, SubmitSummary>(
    await Promise.all(
      openQuarters.map(async (o) => {
        const s = await compilePeriodSummary({
          entityId: ctx.entityId,
          taxYear: mtd.taxYear,
          periodKey: o.periodKey,
          from: new Date(o.startDate),
          to: new Date(o.endDate),
        });
        return [o.periodKey, { income: s.income, expenses: s.expenses }] as const;
      }),
    ),
  );

  const latestCalcId = mtd.calculation?.calculationId ?? null;

  return (
    <div className="space-y-6">
      <SectionCoachmark section="mtd" />
      <PageHeader
        title="Making Tax Digital"
        description={`Quarterly updates for Income Tax · tax year ${mtd.taxYear}`}
        actions={
          mtd.connected ? (
            <Badge tone="success">
              <CheckCircle2 className="h-3 w-3" /> HMRC connected ({mtd.mode})
            </Badge>
          ) : canSubmit ? (
            <ConnectHmrcButton />
          ) : null
        }
      />

      {sp.connected ? (
        <p className="flex items-center gap-2 rounded-md bg-success/10 px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" /> Connected to HMRC. You can now submit updates.
        </p>
      ) : null}
      {sp.error ? (
        <p className="flex items-center gap-2 rounded-md bg-danger/10 px-4 py-3 text-sm text-danger">
          <AlertCircle className="h-4 w-4" /> HMRC connection failed: {sp.error}
        </p>
      ) : null}

      {isAgent ? (
        <p className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
          <UserCog className="h-4 w-4 text-primary" /> You are submitting as an{" "}
          <strong>accountant</strong> on behalf of {ctx.entityName}. Every submission is
          recorded against your account.
        </p>
      ) : null}

      {/* Connection / prerequisites */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" /> HMRC connection
          </CardTitle>
          <CardDescription>
            Authorise PropManage to file on your behalf. You sign in with your Government
            Gateway user ID on HMRC&apos;s own site — PropManage never sees or stores your
            Gateway password.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-sm">
            <span className="text-muted-foreground">Status</span>
            <Badge
              tone={
                mtd.status === "CONNECTED"
                  ? "success"
                  : mtd.status === "EXPIRED" || mtd.status === "ERROR"
                    ? "danger"
                    : "neutral"
              }
            >
              {mtd.status}
            </Badge>
            {mtd.businessId ? (
              <span className="text-muted-foreground">
                Business <span className="font-mono text-foreground">{mtd.businessId}</span>
              </span>
            ) : null}
            {mtd.expiresAt ? (
              <span className="text-muted-foreground">
                Token expires {relativeDays(mtd.expiresAt)}
              </span>
            ) : null}
          </div>

          {canSubmit ? (
            <>
              <NinoForm current={mtd.nino} />
              {(mtd.status === "EXPIRED" || mtd.status === "ERROR") ? (
                <ConnectHmrcButton reconnect />
              ) : null}
              {mtd.connected ? <RefreshObligations taxYear={mtd.taxYear} /> : null}
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              You have view-only access. Ask an owner or accountant to submit.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Obligations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck2 className="h-5 w-5 text-primary" /> Quarterly obligations
          </CardTitle>
          <CardDescription>
            Periods HMRC expects a digital update for, with deadlines. Submit each quarter.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {mtd.obligations.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">
              {mtd.connected
                ? "No obligations returned yet — refresh from HMRC above."
                : "Connect to HMRC to load your obligations."}
            </p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Obligation</TH>
                  <TH>Period</TH>
                  <TH>Due</TH>
                  <TH>Status</TH>
                  <TH className="text-right">Action</TH>
                </TR>
              </THead>
              <TBody>
                {mtd.obligations.map((o) => {
                  const isFinal = o.type === "FINAL_DECLARATION";
                  return (
                    <TR key={o.periodKey}>
                      <TD className="font-medium">
                        {isFinal ? "Final declaration" : "Quarterly update"}
                        <span className="ml-1 font-mono text-xs text-muted-foreground">
                          {o.periodKey}
                        </span>
                      </TD>
                      <TD className="text-sm text-muted-foreground">
                        {formatDate(o.startDate)} – {formatDate(o.endDate)}
                      </TD>
                      <TD className="text-sm">
                        {formatDate(o.dueDate)}{" "}
                        <span className="text-muted-foreground">({relativeDays(o.dueDate)})</span>
                      </TD>
                      <TD>
                        <Badge tone={o.status === "FULFILLED" ? "success" : "warning"}>
                          <Clock className="h-3 w-3" /> {o.status}
                        </Badge>
                      </TD>
                      <TD className="text-right">
                        {o.status === "FULFILLED" ? (
                          <span className="text-xs text-success">Submitted</span>
                        ) : isFinal ? (
                          <HmrcSubmitDialog
                            kind="final"
                            taxYear={mtd.taxYear}
                            calculationId={latestCalcId ?? undefined}
                            triggerLabel="Final declaration"
                            title="Submit your Final Declaration"
                            warning="This crystallises your whole return for the year and confirms it is correct and complete."
                            disabled={!canSubmit || !mtd.connected || !latestCalcId}
                            buttonVariant="outline"
                          />
                        ) : (
                          <HmrcSubmitDialog
                            kind="quarterly"
                            taxYear={mtd.taxYear}
                            periodKey={o.periodKey}
                            triggerLabel="Submit update"
                            title="Submit quarterly update"
                            warning="These figures are compiled from your categorised transactions for the period."
                            summary={summaries.get(o.periodKey)}
                            disabled={!canSubmit || !mtd.connected}
                          />
                        )}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* HMRC calculation */}
      <CalculationCard
        taxYear={mtd.taxYear}
        connected={mtd.connected}
        initial={mtd.calculation}
      />

      {/* End-of-Period Statement + Final Declaration */}
      <Card>
        <CardHeader>
          <CardTitle>End-of-year steps</CardTitle>
          <CardDescription>
            After the four quarters: finalise the business (EOPS), then submit the Final
            Declaration to crystallise the year.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-3">
          <HmrcSubmitDialog
            kind="eops"
            taxYear={mtd.taxYear}
            triggerLabel="Submit End-of-Period Statement"
            title="Submit End-of-Period Statement (EOPS)"
            warning="This finalises this property business's figures for the tax year."
            disabled={!canSubmit || !mtd.connected || !mtd.businessId}
            buttonVariant="outline"
            buttonSize="md"
          />
          <HmrcSubmitDialog
            kind="final"
            taxYear={mtd.taxYear}
            calculationId={latestCalcId ?? undefined}
            triggerLabel="Submit Final Declaration"
            title="Submit your Final Declaration"
            warning="This crystallises your whole return for the year and confirms it is correct and complete."
            disabled={!canSubmit || !mtd.connected || !latestCalcId}
            buttonVariant="outline"
            buttonSize="md"
          />
          {!latestCalcId ? (
            <span className="text-xs text-muted-foreground">
              Run a calculation first to enable the Final Declaration.
            </span>
          ) : null}
        </CardContent>
      </Card>

      {/* Submission log / receipts */}
      <Card>
        <CardHeader>
          <CardTitle>Submission history</CardTitle>
          <CardDescription>Every submission to HMRC, with its receipt ID.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {mtd.submissions.length === 0 ? (
            <p className="p-5 text-sm text-muted-foreground">No submissions yet.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>When</TH>
                  <TH>Type</TH>
                  <TH>Period</TH>
                  <TH>Status</TH>
                  <TH>HMRC receipt</TH>
                </TR>
              </THead>
              <TBody>
                {mtd.submissions.map((s) => (
                  <TR key={s.id}>
                    <TD className="text-sm text-muted-foreground">
                      {formatDate(s.submittedAt ?? s.createdAt)}
                    </TD>
                    <TD className="text-sm">{s.type.replace(/_/g, " ")}</TD>
                    <TD className="font-mono text-xs">{s.periodKey ?? "—"}</TD>
                    <TD>
                      <Badge
                        tone={
                          s.status === "ACCEPTED"
                            ? "success"
                            : s.status === "REJECTED"
                              ? "danger"
                              : "neutral"
                        }
                      >
                        {s.status}
                      </Badge>
                    </TD>
                    <TD className="font-mono text-xs">{s.hmrcReceiptId ?? "—"}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <DisclaimerBanner text="MTD figures are derived from your categorised records and are not tax advice." />

      <p className="text-center text-xs text-muted-foreground">
        Connected via{" "}
        <Link href="https://developer.service.hmrc.gov.uk" className="underline">
          HMRC{mtd.mode === "mock" ? " sandbox (mock)" : ""}
        </Link>
        . PropManage uses OAuth — it never stores your Government Gateway password.
      </p>
    </div>
  );
}
