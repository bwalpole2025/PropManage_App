// Renders a ReportDocument on screen using the shared UI kit. This is the third
// output of the same document that drives CSV (lib/reports/csv) and PDF
// (lib/reports/pdf), so what you see is exactly what you export.

import { formatDate, formatPence } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CurrencyValue } from "@/components/shared/currency-value";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  columnAlign,
  type CellValue,
  type ReportColumn,
  type ReportDocument,
  type ReportRow,
  type ReportSection,
  type ReportTable,
  type SummaryItem,
} from "@/lib/reports/types";

const alignClass: Record<"left" | "right" | "center", string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
};

function renderCell(col: ReportColumn, value: CellValue) {
  if (value === null || value === undefined || value === "") return "";
  if (col.type === "currency") {
    return typeof value === "number" ? <CurrencyValue pence={value} /> : String(value);
  }
  if (col.type === "date") {
    return value instanceof Date ? formatDate(value) : String(value);
  }
  if (col.type === "number") {
    return <span className="tabular-nums">{String(value)}</span>;
  }
  return value instanceof Date ? formatDate(value) : String(value);
}

function SummaryGrid({ items }: { items: SummaryItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
      {items.map((item, i) => {
        const tone =
          item.tone === "income"
            ? "text-success"
            : item.tone === "expense"
              ? "text-danger"
              : item.tone === "auto"
                ? (item.pence ?? 0) >= 0
                  ? "text-success"
                  : "text-danger"
                : item.tone === "muted"
                  ? "text-muted-foreground"
                  : "text-foreground";
        return (
          <div key={i} className="rounded-lg border border-border bg-card/60 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {item.label}
            </p>
            <p
              className={cn(
                "mt-1 tabular-nums",
                item.emphasis ? "text-xl font-semibold" : "text-lg font-medium",
                tone,
              )}
            >
              {item.pence !== undefined ? formatPence(item.pence) : (item.text ?? "—")}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function ReportTableView({ table }: { table: ReportTable }) {
  if (table.rows.length === 0) {
    return (
      <div>
        {table.title ? <p className="mb-2 text-sm font-semibold">{table.title}</p> : null}
        <p className="rounded-md border border-dashed border-border bg-card/50 p-4 text-sm text-muted-foreground">
          {table.emptyText ?? "No data for this selection."}
        </p>
      </div>
    );
  }
  return (
    <div className="space-y-2">
      {table.title ? <p className="text-sm font-semibold">{table.title}</p> : null}
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <THead>
            <TR>
              {table.columns.map((c) => (
                <TH key={c.key} className={alignClass[columnAlign(c)]}>
                  {c.label}
                </TH>
              ))}
            </TR>
          </THead>
          <TBody>
            {table.rows.map((row: ReportRow, i) => (
              <TR key={i}>
                {table.columns.map((c) => (
                  <TD key={c.key} className={cn(alignClass[columnAlign(c)], "whitespace-nowrap")}>
                    {renderCell(c, row[c.key])}
                  </TD>
                ))}
              </TR>
            ))}
            {table.totals ? (
              <TR className="border-t-2 border-border font-semibold">
                {table.columns.map((c) => (
                  <TD key={c.key} className={cn(alignClass[columnAlign(c)], "whitespace-nowrap")}>
                    {renderCell(c, table.totals![c.key])}
                  </TD>
                ))}
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
      {table.note ? <p className="text-xs text-muted-foreground">{table.note}</p> : null}
    </div>
  );
}

function SectionView({ section }: { section: ReportSection }) {
  const hasTableData = (section.tables ?? []).some((t) => t.rows.length > 0);
  const isEmpty = !section.summary?.length && !hasTableData;

  return (
    <Card>
      {section.title || section.description ? (
        <CardHeader>
          {section.title ? <CardTitle>{section.title}</CardTitle> : null}
          {section.description ? (
            <CardDescription>{section.description}</CardDescription>
          ) : null}
        </CardHeader>
      ) : null}
      <CardContent className="space-y-5">
        {section.summary?.length ? <SummaryGrid items={section.summary} /> : null}
        {(section.tables ?? []).map((t, i) => (
          <ReportTableView key={i} table={t} />
        ))}
        {isEmpty ? (
          <p className="text-sm text-muted-foreground">
            {section.emptyText ?? "No data for this selection."}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export function ReportView({ doc }: { doc: ReportDocument }) {
  return (
    <div className="space-y-6">
      {doc.sections.map((s, i) => (
        <SectionView key={i} section={s} />
      ))}
      {doc.disclaimer ? (
        <p className="text-xs text-muted-foreground">{doc.disclaimer}</p>
      ) : null}
    </div>
  );
}
