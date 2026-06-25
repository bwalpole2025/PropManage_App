import { CalendarDays } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getFilesAndDates } from "@/services/files";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, relativeDays } from "@/lib/format";
import {
  DocumentCategoryLabel,
  ImportantDateKindLabel,
} from "@/lib/enums";

type AgendaItem = {
  id: string;
  date: Date;
  title: string;
  property: string;
  tone: "info" | "warning";
  tag: string;
};

const monthFmt = new Intl.DateTimeFormat("en-GB", {
  month: "long",
  year: "numeric",
});

export default async function CalendarPage() {
  const ctx = await getActiveContext();
  const { reminders, compliance } = await getFilesAndDates(ctx.entityId);

  const items: AgendaItem[] = [
    ...reminders.map((r) => ({
      id: `r-${r.id}`,
      date: new Date(r.dueDate),
      title: r.name,
      property: r.property?.addressLine1 ?? "Portfolio",
      tone: "info" as const,
      tag:
        ImportantDateKindLabel[r.kind as keyof typeof ImportantDateKindLabel] ??
        r.kind,
    })),
    ...compliance.map((c) => ({
      id: `c-${c.id}`,
      date: new Date(c.expiryDate!),
      title: `${
        DocumentCategoryLabel[c.category as keyof typeof DocumentCategoryLabel] ??
        c.category
      } expires`,
      property: c.property?.addressLine1 ?? "Portfolio-wide",
      tone: "warning" as const,
      tag: "Expiry",
    })),
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  // Group into month sections, preserving chronological order.
  const months: { key: string; items: AgendaItem[] }[] = [];
  for (const item of items) {
    const key = monthFmt.format(item.date);
    const last = months[months.length - 1];
    if (last && last.key === key) last.items.push(item);
    else months.push({ key, items: [item] });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Calendar"
        description="Upcoming key dates and certificate expiries across your portfolio."
      />

      {months.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <EmptyState
              icon={<CalendarDays className="h-6 w-6" />}
              title="Nothing scheduled"
              description="Reminders and certificate expiries appear here on a timeline."
            />
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {months.map((m) => (
            <Card key={m.key}>
              <CardContent className="pt-6">
                <h2 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {m.key}
                </h2>
                <ul className="divide-y divide-border">
                  {m.items.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div className="w-16 shrink-0 text-sm font-medium">
                          {formatDate(item.date)}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">
                            {item.title}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {item.property}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge tone={item.tone}>{item.tag}</Badge>
                        <span className="hidden text-xs text-muted-foreground sm:inline">
                          {relativeDays(item.date)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
