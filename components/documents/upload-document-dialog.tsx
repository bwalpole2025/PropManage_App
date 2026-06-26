"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Upload } from "lucide-react";
import {
  uploadDocumentAction,
  type DocumentActionState,
} from "@/actions/document";
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
import {
  DOCUMENT_CATEGORY_GROUPS,
  DocumentCategory,
  DocumentCategoryLabel,
} from "@/lib/enums";

interface Props {
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
  customCategories: { id: string; name: string }[];
  /** Preselect a category (e.g. RECEIPT when opened from the Receipts tab). */
  defaultCategory?: string;
  triggerLabel?: string;
}

export function UploadDocumentDialog({
  properties,
  tenancies,
  customCategories,
  defaultCategory = DocumentCategory.GAS_SAFETY,
  triggerLabel = "Upload new file",
}: Props) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const [state, action, pending] = useActionState<DocumentActionState, FormData>(
    uploadDocumentAction,
    {},
  );

  useEffect(() => {
    if (state.ok && open) {
      setOpen(false);
      router.refresh();
    }
  }, [state.ok, state.at, open, router]);

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Upload className="h-4 w-4" /> {triggerLabel}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogClose onClose={() => setOpen(false)} />
          <DialogHeader>
            <DialogTitle>Upload a document</DialogTitle>
            <DialogDescription>
              Store a certificate, receipt or statement — optionally with an
              expiry date so we can remind you.
            </DialogDescription>
          </DialogHeader>
          <form action={action} className="space-y-4">
            <div>
              <Label htmlFor="file">File (optional)</Label>
              <Input id="file" name="file" type="file" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  name="category"
                  required
                  defaultValue={defaultCategory}
                >
                  {DOCUMENT_CATEGORY_GROUPS.map((g) => (
                    <optgroup key={g.label} label={g.label}>
                      {g.categories.map((c) => (
                        <option key={c} value={c}>
                          {DocumentCategoryLabel[c]}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                  {customCategories.length > 0 ? (
                    <optgroup label="Custom">
                      {customCategories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </optgroup>
                  ) : null}
                </Select>
              </div>
              <div>
                <Label htmlFor="reference">Reference (optional)</Label>
                <Input
                  id="reference"
                  name="reference"
                  placeholder="Certificate no."
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="issuedDate">Issued date (optional)</Label>
                <Input id="issuedDate" name="issuedDate" type="date" />
              </div>
              <div>
                <Label htmlFor="expiryDate">Expiry date (optional)</Label>
                <Input id="expiryDate" name="expiryDate" type="date" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="propertyId">Property (optional)</Label>
                <Select id="propertyId" name="propertyId" defaultValue="">
                  <option value="">No specific property</option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.addressLine1}
                    </option>
                  ))}
                </Select>
              </div>
              <div>
                <Label htmlFor="tenancyId">Tenancy (optional)</Label>
                <Select id="tenancyId" name="tenancyId" defaultValue="">
                  <option value="">No specific tenancy</option>
                  {tenancies.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Set an expiry date and we&apos;ll remind you 30, 14, 7 and 1 days
              before — and add it to your calendar.
            </p>

            {state.error ? (
              <p className="text-sm text-danger">{state.error}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={pending}>
                {pending ? "Saving…" : "Save document"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
