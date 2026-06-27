"use client";

// Client renderer for a ReportTable whose rows carry expandable detail (e.g. the
// Income Statement P&L, where each category drills down to its transactions).
// Plain tables are rendered server-side by ReportView; this is used only when a
// table has `rowDetails`, so non-interactive reports stay server-rendered.

import * as React from "react";
import { ChevronRight } from "lucide-react";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import { CurrencyValue } from "@/components/shared/currency-value";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import {
  columnAlign,
  type CellValue,
  type ReportColumn,
  type ReportRow,
  type ReportTable,
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

/** Nested detail table shown when a category row is expanded. */
function DetailTable({
  columns,
  rows,
  emptyText,
}: {
  columns: ReportColumn[];
  rows: ReportRow[];
  emptyText?: string;
}) {
  if (rows.length === 0) {
    return (
      <p className="px-4 py-3 text-sm text-muted-foreground">
        {emptyText ?? "No detail."}
      </p>
    );
  }
  return (
    <Table className="text-xs">
      <THead>
        <TR>
          {columns.map((c) => (
            <TH key={c.key} className={cn(alignClass[columnAlign(c)], "py-2")}>
              {c.label}
            </TH>
          ))}
        </TR>
      </THead>
      <TBody>
        {rows.map((row, i) => (
          <TR key={i}>
            {columns.map((c) => (
              <TD key={c.key} className={cn(alignClass[columnAlign(c)], "py-2")}>
                {renderCell(c, row[c.key])}
              </TD>
            ))}
          </TR>
        ))}
      </TBody>
    </Table>
  );
}

export function ExpandableReportTable({ table }: { table: ReportTable }) {
  const [open, setOpen] = React.useState<Record<number, boolean>>({});
  const toggle = (i: number) => setOpen((o) => ({ ...o, [i]: !o[i] }));

  const detailFor = (i: number) => table.rowDetails?.[i] ?? null;
  // The first column is the "label" column the user clicks to expand.
  const labelKey = table.columns[0]?.key;

  if (table.rows.length === 0) {
    return (
      <div className="space-y-2">
        {table.title ? <p className="text-sm font-semibold">{table.title}</p> : null}
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
            {table.rows.map((row, i) => {
              const detail = detailFor(i);
              const isOpen = !!open[i];
              return (
                <React.Fragment key={i}>
                  <TR className={cn(detail && "cursor-pointer")}>
                    {table.columns.map((c) => {
                      const isLabel = c.key === labelKey;
                      return (
                        <TD
                          key={c.key}
                          className={cn(
                            alignClass[columnAlign(c)],
                            "whitespace-nowrap",
                          )}
                        >
                          {isLabel && detail ? (
                            <button
                              type="button"
                              onClick={() => toggle(i)}
                              aria-expanded={isOpen}
                              aria-controls={`detail-${i}`}
                              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                            >
                              <ChevronRight
                                className={cn(
                                  "h-3.5 w-3.5 shrink-0 transition-transform",
                                  isOpen && "rotate-90",
                                )}
                              />
                              {renderCell(c, row[c.key])}
                            </button>
                          ) : (
                            renderCell(c, row[c.key])
                          )}
                        </TD>
                      );
                    })}
                  </TR>
                  {detail && isOpen ? (
                    <tr id={`detail-${i}`} className="bg-muted/30">
                      <td colSpan={table.columns.length} className="p-0">
                        <div className="border-l-2 border-primary/40 px-2 py-1">
                          <DetailTable
                            columns={detail.columns}
                            rows={detail.rows}
                            emptyText={detail.emptyText}
                          />
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              );
            })}
            {table.totals ? (
              <TR className="border-t-2 border-border font-semibold">
                {table.columns.map((c) => (
                  <TD
                    key={c.key}
                    className={cn(alignClass[columnAlign(c)], "whitespace-nowrap")}
                  >
                    {renderCell(c, table.totals![c.key])}
                  </TD>
                ))}
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>
      {table.note ? (
        <p className="text-xs text-muted-foreground">{table.note}</p>
      ) : null}
    </div>
  );
}
