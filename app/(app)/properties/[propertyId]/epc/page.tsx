import { notFound } from "next/navigation";
import { Leaf } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getPropertyDetail } from "@/services/properties";
import { EpcBand } from "@/components/properties/epc-band";
import { EmptyState } from "@/components/shared/empty-state";
import { ReminderBadge } from "@/components/shared/reminder-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatDate } from "@/lib/format";
import { epcBandTone } from "@/lib/property-finance";
import { DocumentCategory } from "@/lib/enums";

export default async function EpcPage({
  params,
}: {
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const ctx = await getActiveContext();
  const detail = await getPropertyDetail(ctx.entityId, propertyId);
  if (!detail) notFound();

  const { property } = detail;
  const epcDoc = property.documents.find(
    (d) => d.category === DocumentCategory.EPC,
  );
  const rating = property.epcRating?.trim() || null;
  const score = property.epcScore ?? null;
  const expiry = property.epcExpiryDate ?? epcDoc?.expiryDate ?? null;
  const hasEpc = Boolean(rating || score || expiry || epcDoc);
  const tone = epcBandTone(rating);

  if (!hasEpc) {
    return (
      <EmptyState
        icon={<Leaf className="h-5 w-5" />}
        title="No EPC recorded"
        description="Add an EPC rating, score and expiry via 'Edit information' on the Property Info tab, or upload an EPC certificate."
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Energy efficiency rating</CardTitle>
          <Leaf className="h-5 w-5 text-success" />
        </CardHeader>
        <CardContent>
          <EpcBand rating={rating} />
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Current rating</span>
              <span className="text-2xl font-bold">{rating ?? "—"}</span>
            </div>
            <div>
              <div className="mb-1 flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Score</span>
                <span className="font-semibold tabular-nums">
                  {score != null ? `${score}/100` : "—"}
                </span>
              </div>
              <Progress
                value={score ?? 0}
                tone={tone === "neutral" ? "primary" : tone}
              />
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-sm text-muted-foreground">Expiry</span>
              {expiry ? (
                <span className="flex items-center gap-2 text-sm">
                  {formatDate(expiry)}
                  <ReminderBadge date={expiry} />
                </span>
              ) : (
                <span className="text-sm text-muted-foreground">Not recorded</span>
              )}
            </div>
          </CardContent>
        </Card>

        {epcDoc ? (
          <Card>
            <CardHeader>
              <CardTitle>Certificate</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {epcDoc.reference ? (
                <p>
                  <span className="text-muted-foreground">Reference: </span>
                  {epcDoc.reference}
                </p>
              ) : null}
              {epcDoc.file ? (
                <a
                  href={`/api/files/${epcDoc.file.id}`}
                  className="font-medium text-primary hover:underline"
                >
                  Download {epcDoc.file.filename} →
                </a>
              ) : (
                <p className="text-muted-foreground">No file attached.</p>
              )}
            </CardContent>
          </Card>
        ) : null}
      </div>
    </div>
  );
}
