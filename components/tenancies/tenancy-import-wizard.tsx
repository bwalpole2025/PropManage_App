"use client";

import { type ChangeEvent, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, CheckCircle2, AlertCircle } from "lucide-react";
import {
  commitTenancyImportAction,
  type TenancyImportResult,
} from "@/actions/tenancy-import";
import { parseCsv, toCsv } from "@/lib/csv";
import {
  TENANCY_IMPORT_FIELDS,
  detectTenancyMapping,
  toRawTenancyRow,
  validateTenancyRow,
  type TenancyColumnMapping,
  type RawTenancyRow,
} from "@/lib/tenancy-import-mapping";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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

const TEMPLATE = toCsv([
  ["Tenant name", "Tenant email", "Property address", "Postcode", "Rent", "Frequency", "Deposit", "Start date", "End date", "Rent due day"],
  ["Jane Doe", "jane@example.com", "12 Oakfield Road", "BS6 5AB", "1250", "MONTHLY", "1500", "01/06/2026", "", "1"],
]);

export function ImportTenanciesButton({
  properties,
}: {
  properties: { id: string; addressLine1: string; postcode: string }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>("upload");
  const [headers, setHeaders] = useState<string[]>([]);
  const [dataRows, setDataRows] = useState<string[][]>([]);
  const [mapping, setMapping] = useState<TenancyColumnMapping>({});
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<TenancyImportResult | null>(null);
  const [busy, start] = useTransition();

  function reset() {
    setStep("upload");
    setHeaders([]);
    setDataRows([]);
    setMapping({});
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
        aoa = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: "" }) as string[][];
      } else {
        aoa = parseCsv(await file.text());
      }
      aoa = aoa.filter((r) => r.some((c) => (c ?? "").toString().trim() !== ""));
      if (aoa.length < 2) {
        setError("That file has no data rows.");
        return;
      }
      const hdr = aoa[0].map((h) => (h ?? "").toString());
      setHeaders(hdr);
      setDataRows(aoa.slice(1, 1 + 2000));
      setMapping(detectTenancyMapping(hdr));
      setStep("map");
    } catch {
      setError("Could not read that file. Use a CSV or XLSX.");
    }
  }

  const rawRows: RawTenancyRow[] = useMemo(
    () => dataRows.map((cells, i) => toRawTenancyRow(cells, mapping, i + 2)),
    [dataRows, mapping],
  );
  const results = useMemo(
    () => rawRows.map((r) => validateTenancyRow(r, { properties })),
    [rawRows, properties],
  );
  const validCount = results.filter((r) => r.ok).length;
  const errorCount = results.length - validCount;
  const requiredUnmapped = TENANCY_IMPORT_FIELDS.filter(
    (f) => f.required && mapping[f.key] == null,
  );

  function commit() {
    setError(null);
    start(async () => {
      try {
        const res = await commitTenancyImportAction(rawRows);
        setResult(res);
        setStep("result");
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  const templateHref =
    "data:text/csv;charset=utf-8," + encodeURIComponent(TEMPLATE);

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> Upload tenancies
      </Button>
      <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
        <DialogContent className="max-w-3xl">
          <DialogClose onClose={close} />
          <DialogHeader>
            <DialogTitle>Upload tenancies</DialogTitle>
            <DialogDescription>
              {step === "upload" && "Upload a CSV or XLSX of tenancies."}
              {step === "map" && "Match your columns to the right fields."}
              {step === "preview" && "Review and validate before importing."}
              {step === "result" && "Import complete."}
            </DialogDescription>
          </DialogHeader>

          {error ? <p className="mb-3 text-sm text-danger">{error}</p> : null}

          {step === "upload" ? (
            <div>
              <Label htmlFor="tenancy-file">File</Label>
              <Input
                id="tenancy-file"
                type="file"
                accept=".csv,.xlsx,.xls,text/csv"
                onChange={onFile}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                Columns: Tenant name, Property address, Postcode, Rent, Start date
                (required); Email, Frequency, Deposit, End date, Rent due day
                (optional). Each row is matched to an existing property by address
                + postcode.{" "}
                <a
                  href={templateHref}
                  download="tenancies-template.csv"
                  className="font-medium text-primary hover:underline"
                >
                  Download template
                </a>
              </p>
            </div>
          ) : null}

          {step === "map" ? (
            <div className="space-y-3">
              {TENANCY_IMPORT_FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-3">
                  <Label className="w-36 shrink-0">
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
                  Map required fields:{" "}
                  {requiredUnmapped.map((f) => f.label).join(", ")}.
                </p>
              ) : null}
            </div>
          ) : null}

          {step === "preview" ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2 text-sm">
                <Badge tone="success">{validCount} valid</Badge>
                <Badge tone="danger">{errorCount} errors</Badge>
                <span className="text-muted-foreground">of {results.length} rows</span>
              </div>
              <div className="max-h-[20rem] overflow-auto rounded-md border border-border">
                <Table>
                  <THead>
                    <TR>
                      <TH>Row</TH>
                      <TH>Tenant</TH>
                      <TH>Property</TH>
                      <TH>Rent</TH>
                      <TH>Start</TH>
                      <TH>Status</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {results.map((r, i) => {
                      const raw = rawRows[i];
                      return (
                        <TR key={raw.rowNumber}>
                          <TD className="text-muted-foreground">{raw.rowNumber}</TD>
                          <TD>
                            {raw.tenantName}
                            {!r.ok ? (
                              <p className="text-xs text-danger">
                                {r.errors.map((e) => e.message).join("; ")}
                              </p>
                            ) : null}
                          </TD>
                          <TD>{raw.propertyAddress}</TD>
                          <TD>{raw.rent}</TD>
                          <TD>{raw.startDate}</TD>
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
                        </TR>
                      );
                    })}
                  </TBody>
                </Table>
              </div>
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
                <Button onClick={commit} disabled={busy || validCount === 0}>
                  {busy ? "Importing…" : `Import ${validCount} tenancies`}
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
