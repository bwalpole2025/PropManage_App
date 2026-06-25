"use client";

import { type ChangeEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Download, CheckCircle2, AlertCircle } from "lucide-react";
import { commitImportAction, type CommitResult } from "@/actions/import";
import { uploadFileAction } from "@/actions/file";
import { parseCsv } from "@/lib/csv";
import {
  IMPORT_FIELDS,
  detectMapping,
  summarise,
  toRawRow,
  validateRow,
  type ColumnMapping,
  type RawImportRow,
  type ValidateContext,
} from "@/lib/import-mapping";
import { Badge } from "@/components/ui/badge";
import { Button, type ButtonProps } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input, Label, Select } from "@/components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";

type Step = "upload" | "map" | "preview" | "result";
const PREVIEW_LIMIT = 200;

export function ImportWizardButton({
  properties,
  tenancies,
  canManageFiles,
  label = "Import file",
  variant = "secondary",
  className,
}: {
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
  canManageFiles: boolean;
  label?: string;
  variant?: ButtonProps["variant"];
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [receipts, setReceipts] = useState<Record<number, File>>({});
  const [truncated, setTruncated] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CommitResult | null>(null);
  const [busy, start] = useTransition();

  const ctx: ValidateContext = useMemo(
    () => ({ properties, tenancies }),
    [properties, tenancies],
  );

  function reset() {
    setStep("upload");
    setHeaders([]);
    setDataRows([]);
    setMapping({});
    setReceipts({});
    setTruncated(0);
    setError(null);
    setResult(null);
  }

  function close() {
    setOpen(false);
    setTimeout(reset, 200);
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      let aoa: string[][];
      if (/\.(xlsx|xls)$/i.test(file.name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        aoa = XLSX.utils.sheet_to_json(ws, {
          header: 1,
          raw: false,
          defval: "",
        }) as string[][];
      } else {
        aoa = parseCsv(await file.text());
      }
      aoa = aoa.filter((r) => r.some((c) => (c ?? "").toString().trim() !== ""));
      if (aoa.length < 2) {
        setError("That file has no data rows.");
        return;
      }
      const hdr = aoa[0].map((h) => (h ?? "").toString());
      const allData = aoa.slice(1);
      setHeaders(hdr);
      setDataRows(allData.slice(0, 5000));
      setTruncated(allData.length > 5000 ? allData.length : 0);
      setMapping(detectMapping(hdr));
      setStep("map");
    } catch {
      setError("Could not read that file. Use a CSV or XLSX export.");
    }
  }

  const rawRows: RawImportRow[] = useMemo(
    () =>
      dataRows.map((cells, i) => toRawRow(cells, mapping, i + 2)),
    [dataRows, mapping],
  );

  const results = useMemo(
    () => rawRows.map((r) => validateRow(r, ctx)),
    [rawRows, ctx],
  );
  const summary = useMemo(() => summarise(results), [results]);

  const requiredUnmapped = IMPORT_FIELDS.filter(
    (f) => f.required && mapping[f.key] == null,
  );

  async function commit() {
    setError(null);
    start(async () => {
      try {
        // Upload any per-row receipts first, then attach by fileId.
        const withReceipts: RawImportRow[] = [];
        for (let i = 0; i < rawRows.length; i++) {
          const file = receipts[rawRows[i].rowNumber];
          let receiptFileId: string | null = null;
          // Only upload receipts for rows that will actually commit (valid) —
          // avoids orphan files for error rows.
          if (file && canManageFiles && results[i]?.ok) {
            const fd = new FormData();
            fd.set("file", file);
            const up = await uploadFileAction(fd);
            receiptFileId = up.id;
          }
          withReceipts.push({ ...rawRows[i], receiptFileId });
        }
        const res = await commitImportAction(withReceipts);
        setResult(res);
        setStep("result");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <>
      <Button variant={variant} className={className} onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> {label}
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-3xl">
          <DialogClose onClose={close} />
          <DialogHeader>
            <DialogTitle>Import transactions</DialogTitle>
            <DialogDescription>
              {step === "upload" && "Upload a CSV or XLSX of income & expenses."}
              {step === "map" && "Match your columns to the right fields."}
              {step === "preview" && "Review and validate before importing."}
              {step === "result" && "Import complete."}
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

          {step === "upload" ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="import-file">File</Label>
                <Input
                  id="import-file"
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv"
                  onChange={onFile}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Need a starting point?{" "}
                <a
                  href="/api/transactions/import-template?format=csv"
                  download
                  className="text-primary hover:underline"
                >
                  <Download className="inline h-3.5 w-3.5" /> CSV template
                </a>{" "}
                ·{" "}
                <a
                  href="/api/transactions/import-template?format=xlsx"
                  download
                  className="text-primary hover:underline"
                >
                  XLSX template
                </a>
              </p>
            </div>
          ) : null}

          {step === "map" ? (
            <div className="space-y-3">
              {IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="w-28 shrink-0">
                    {f.label}
                    {f.required ? <span className="text-danger"> *</span> : null}
                  </Label>
                  <Select
                    className="h-9 w-auto"
                    value={mapping[f.key] ?? ""}
                    onChange={(e) =>
                      setMapping((m) => ({
                        ...m,
                        [f.key]: e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">— not mapped —</option>
                    {headers.map((h, i) => (
                      <option key={i} value={i}>
                        {h || `Column ${i + 1}`}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
              {requiredUnmapped.length > 0 ? (
                <p className="text-sm text-warning-foreground">
                  Map all required fields:{" "}
                  {requiredUnmapped.map((f) => f.label).join(", ")}.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge tone="success">{summary.valid} valid</Badge>
                <Badge tone="danger">{summary.errorCount} errors</Badge>
                <Badge tone="warning">{summary.duplicateCount} duplicates</Badge>
                <span className="text-muted-foreground">
                  of {results.length} rows
                </span>
              </div>
              <div className="max-h-[22rem] overflow-auto rounded-md border border-border">
                <Table>
                  <THead>
                    <TR>
                      <TH>Row</TH>
                      <TH>Date</TH>
                      <TH>Description</TH>
                      <TH className="text-right">Amount</TH>
                      <TH>Status</TH>
                      {canManageFiles ? <TH>Receipt</TH> : null}
                    </TR>
                  </THead>
                  <TBody>
                    {results.slice(0, PREVIEW_LIMIT).map((r, i) => {
                      const raw = rawRows[i];
                      return (
                        <TR key={raw.rowNumber}>
                          <TD className="text-muted-foreground">{raw.rowNumber}</TD>
                          <TD className="whitespace-nowrap">{raw.date}</TD>
                          <TD>
                            {raw.description}
                            {!r.ok ? (
                              <p className="text-xs text-danger">
                                {r.errors.map((e) => e.message).join("; ")}
                              </p>
                            ) : null}
                          </TD>
                          <TD className="whitespace-nowrap text-right">{raw.amount}</TD>
                          <TD>
                            {r.ok ? (
                              <span className="inline-flex items-center gap-1 text-xs text-success">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Valid
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs text-danger">
                                <AlertCircle className="h-3.5 w-3.5" /> Error
                              </span>
                            )}
                          </TD>
                          {canManageFiles ? (
                            <TD>
                              <input
                                type="file"
                                className="w-28 text-xs"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  setReceipts((prev) => {
                                    const next = { ...prev };
                                    if (file) next[raw.rowNumber] = file;
                                    else delete next[raw.rowNumber];
                                    return next;
                                  });
                                }}
                              />
                            </TD>
                          ) : null}
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
              {results.length > PREVIEW_LIMIT ? (
                <p className="text-xs text-muted-foreground">
                  Showing first {PREVIEW_LIMIT} of {results.length} rows. All valid
                  rows will be imported.
                </p>
              ) : null}
              {truncated > 0 ? (
                <p className="text-xs text-warning-foreground">
                  Large file: only the first 5,000 of {truncated.toLocaleString()}{" "}
                  rows were loaded. Split the file to import the rest.
                </p>
              ) : null}
              <p className="text-xs text-muted-foreground">
                Duplicates (same date, amount &amp; description as an existing
                transaction) are skipped automatically.
              </p>
            </div>
          ) : null}

          {step === "result" && result ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <Badge tone="success">{result.created} imported</Badge>
                <Badge tone="warning">{result.duplicates} duplicates skipped</Badge>
                <Badge tone="danger">{result.errors.length} errors</Badge>
              </div>
              {result.errors.length > 0 ? (
                <div className="max-h-48 overflow-auto rounded-md border border-border p-2 text-xs">
                  {result.errors.map((e) => (
                    <p key={e.row}>
                      Row {e.row}: {e.message}
                    </p>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}

          <DialogFooter>
            {step === "upload" ? (
              <Button variant="ghost" onClick={close}>
                Cancel
              </Button>
            ) : null}
            {step === "map" ? (
              <>
                <Button variant="ghost" onClick={() => setStep("upload")}>
                  Back
                </Button>
                <Button
                  onClick={() => setStep("preview")}
                  disabled={requiredUnmapped.length > 0}
                >
                  Preview
                </Button>
              </>
            ) : null}
            {step === "preview" ? (
              <>
                <Button variant="ghost" onClick={() => setStep("map")}>
                  Back
                </Button>
                <Button onClick={commit} disabled={busy || summary.valid === 0}>
                  {busy ? "Importing…" : `Import ${summary.valid} rows`}
                </Button>
              </>
            ) : null}
            {step === "result" ? <Button onClick={close}>Done</Button> : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
