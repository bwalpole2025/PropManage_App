"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { UploadCloud, FileCheck2, CheckCircle2 } from "lucide-react";
import {
  uploadCertificateAction,
  type ComplianceActionState,
} from "@/actions/compliance";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { COMPLIANCE_CATEGORIES, DocumentCategoryLabel } from "@/lib/enums";

/**
 * Drag-and-drop a renewed certificate (PDF/image). The file is optional — the
 * new expiry date is entered manually here (OCR auto-extraction is a planned
 * follow-up). On save we store the file, update the document and re-arm the
 * 30/14/7/1-day reminders.
 */
export function CertificateUpload({
  properties,
}: {
  properties: { id: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<ComplianceActionState, FormData>(
    uploadCertificateAction,
    {},
  );
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Reset after a successful save.
  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setFileName(null);
    }
  }, [state.ok, state.at]);

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && fileRef.current) {
      fileRef.current.files = e.dataTransfer.files;
      setFileName(file.name);
    }
  }

  if (properties.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Add a property first to upload its certificates.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={formAction} className="space-y-4">
          {/* Dropzone */}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={cn(
              "flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors",
              dragOver
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/40 hover:bg-muted/40",
            )}
          >
            {fileName ? (
              <>
                <FileCheck2 className="h-7 w-7 text-primary" />
                <span className="text-sm font-medium">{fileName}</span>
                <span className="text-xs text-muted-foreground">
                  Click to replace
                </span>
              </>
            ) : (
              <>
                <UploadCloud className="h-7 w-7 text-muted-foreground" />
                <span className="text-sm font-medium">
                  Drag &amp; drop a certificate, or click to browse
                </span>
                <span className="text-xs text-muted-foreground">
                  PDF or image · optional (you can record the dates without a file)
                </span>
              </>
            )}
          </button>
          <input
            ref={fileRef}
            type="file"
            name="file"
            accept="application/pdf,image/*"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="cert-property">Property</Label>
              <Select id="cert-property" name="propertyId" required>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="cert-category">Certificate type</Label>
              <Select id="cert-category" name="category" defaultValue="GAS_SAFETY" required>
                {COMPLIANCE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {DocumentCategoryLabel[c]}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="cert-expiry">New expiry date</Label>
              <Input id="cert-expiry" name="expiryDate" type="date" required />
            </div>
            <div>
              <Label htmlFor="cert-ref">Reference (optional)</Label>
              <Input id="cert-ref" name="reference" placeholder="Certificate no." />
            </div>
          </div>

          {state.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}
          {state.ok ? (
            <p className="flex items-center gap-1.5 text-sm text-success">
              <CheckCircle2 className="h-4 w-4" /> Certificate saved — reminders updated.
            </p>
          ) : null}

          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save certificate"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
