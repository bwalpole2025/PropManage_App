"use client";

import { type ChangeEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Paperclip, RotateCcw, Ban, Check } from "lucide-react";
import {
  excludeTransactionAction,
  reconcileTransactionAction,
  restoreTransactionAction,
  updateTransactionAction,
} from "@/actions/transaction";
import { uploadFileAction } from "@/actions/file";
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
import { Label, Select, Textarea } from "@/components/ui/input";
import {
  ALL_EXPENSE_CATEGORIES,
  ALL_INCOME_CATEGORIES,
  allCategoryLabel,
  subcategoriesFor,
} from "@/lib/categories";
import { TxnStatus } from "@/lib/enums";

export interface EditTxn {
  id: string;
  description: string;
  category: string | null;
  subcategory: string | null;
  propertyId: string | null;
  tenancyId: string | null;
  notes: string | null;
  status: string;
  attachmentFileId: string | null;
}

export function TransactionEditDialog({
  open,
  onOpenChange,
  txn,
  properties,
  tenancies,
  canManageFiles,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  txn: EditTxn;
  properties: { id: string; addressLine1: string }[];
  tenancies: { id: string; label: string }[];
  canManageFiles: boolean;
}) {
  const router = useRouter();
  const [category, setCategory] = useState(txn.category ?? "");
  const [subcategory, setSubcategory] = useState(txn.subcategory ?? "");
  const [propertyId, setPropertyId] = useState(txn.propertyId ?? "");
  const [tenancyId, setTenancyId] = useState(txn.tenancyId ?? "");
  const [notes, setNotes] = useState(txn.notes ?? "");
  const [attachmentId, setAttachmentId] = useState(txn.attachmentFileId);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [pending, start] = useTransition();
  const subs = subcategoriesFor(category);

  function save() {
    setError(null);
    start(async () => {
      try {
        await updateTransactionAction(txn.id, {
          category: category || null,
          subcategory: subcategory || null,
          propertyId: propertyId || null,
          tenancyId: tenancyId || null,
          notes,
        });
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.set("file", file);
      fd.set("transactionId", txn.id);
      const res = await uploadFileAction(fd);
      setAttachmentId(res.id);
      router.refresh();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  function runStatus(fn: () => Promise<void>) {
    setError(null);
    start(async () => {
      try {
        await fn();
        onOpenChange(false);
        router.refresh();
      } catch (e) {
        setError((e as Error).message);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogClose onClose={() => onOpenChange(false)} />
        <DialogHeader>
          <DialogTitle>Edit transaction</DialogTitle>
          <DialogDescription>{txn.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="edit-cat">Category</Label>
              <Select
                id="edit-cat"
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory("");
                }}
              >
                <option value="">Uncategorised</option>
                <optgroup label="Income">
                  {ALL_INCOME_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {allCategoryLabel[c]}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Expenses">
                  {ALL_EXPENSE_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {allCategoryLabel[c]}
                    </option>
                  ))}
                </optgroup>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-sub">Subcategory</Label>
              <Select
                id="edit-sub"
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={subs.length === 0}
              >
                <option value="">{subs.length ? "None" : "—"}</option>
                {subs.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-prop">Property</Label>
              <Select
                id="edit-prop"
                value={propertyId}
                onChange={(e) => setPropertyId(e.target.value)}
              >
                <option value="">Default portfolio (unlinked)</option>
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.addressLine1}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-ten">Tenancy</Label>
              <Select
                id="edit-ten"
                value={tenancyId}
                onChange={(e) => setTenancyId(e.target.value)}
              >
                <option value="">None</option>
                {tenancies.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="edit-notes">Notes</Label>
            <Textarea
              id="edit-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Free-text notes…"
            />
          </div>

          {/* Receipt */}
          <div className="flex items-center gap-3">
            {attachmentId ? (
              <a
                href={`/api/files/${attachmentId}`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
              >
                <Paperclip className="h-4 w-4" /> View receipt
              </a>
            ) : (
              <span className="text-sm text-muted-foreground">No receipt</span>
            )}
            {canManageFiles ? (
              <label className="inline-flex cursor-pointer items-center gap-1 text-sm text-foreground hover:text-primary">
                <Paperclip className="h-4 w-4" />
                {uploading ? "Uploading…" : attachmentId ? "Replace" : "Attach receipt"}
                <input
                  type="file"
                  className="hidden"
                  onChange={onFile}
                  disabled={uploading}
                />
              </label>
            ) : null}
          </div>

          {error ? <p className="text-sm text-danger">{error}</p> : null}

          {/* Status actions */}
          <div className="flex flex-wrap gap-2 border-t border-border pt-3">
            {txn.status === TxnStatus.UNRECONCILED ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() =>
                  runStatus(() => reconcileTransactionAction(txn.id))
                }
              >
                <Check className="h-4 w-4" /> Mark reconciled
              </Button>
            ) : null}
            {txn.status === TxnStatus.EXCLUDED ? (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => runStatus(() => restoreTransactionAction(txn.id))}
              >
                <RotateCcw className="h-4 w-4" /> Reactivate
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                disabled={pending}
                onClick={() => runStatus(() => excludeTransactionAction(txn.id))}
              >
                <Ban className="h-4 w-4" /> Deactivate
              </Button>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={save} disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
