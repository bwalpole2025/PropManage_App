"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, RotateCcw, Trash2 } from "lucide-react";
import {
  completeReminderAction,
  reopenReminderAction,
  deleteReminderAction,
} from "@/actions/reminder";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate, daysUntil } from "@/lib/format";

interface ReminderRow {
  id: string;
  name: string;
  description: string | null;
  dueDate: Date | string;
  status: string;
}

export function RemindersTable({
  reminders,
  tab,
}: {
  reminders: ReminderRow[];
  tab: "open" | "completed";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function run(
    id: string,
    fn: (id: string) => Promise<{ ok?: boolean; error?: string }>,
  ) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await fn(id);
      setBusyId(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  if (reminders.length === 0) {
    return (
      <EmptyState
        icon={<Check className="h-6 w-6" />}
        title={tab === "open" ? "All up to date!" : "Nothing completed yet"}
        description={
          tab === "open"
            ? "New reminders you create will appear here and on your calendar."
            : "Completed reminders will be listed here."
        }
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Table>
        <THead>
          <TR>
            <TH>Due date</TH>
            <TH>Name</TH>
            <TH>Description</TH>
            <TH>Status</TH>
            <TH className="text-right">Actions</TH>
          </TR>
        </THead>
        <TBody>
          {reminders.map((r) => {
            const overdue = tab === "open" && daysUntil(r.dueDate) < 0;
            const busy = pending && busyId === r.id;
            return (
              <TR key={r.id}>
                <TD className="whitespace-nowrap">{formatDate(r.dueDate)}</TD>
                <TD className="font-medium">{r.name}</TD>
                <TD className="text-muted-foreground">
                  {r.description ?? "—"}
                </TD>
                <TD>
                  {r.status === "COMPLETED" ? (
                    <Badge tone="success">Completed</Badge>
                  ) : overdue ? (
                    <Badge tone="danger">Overdue</Badge>
                  ) : (
                    <Badge tone="info">Open</Badge>
                  )}
                </TD>
                <TD>
                  <div className="flex items-center justify-end gap-1">
                    {tab === "open" ? (
                      <button
                        type="button"
                        onClick={() => run(r.id, completeReminderAction)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-success hover:bg-success/10 disabled:opacity-50"
                      >
                        <Check className="h-3.5 w-3.5" /> Complete
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => run(r.id, reopenReminderAction)}
                        disabled={busy}
                        className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Reopen
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => run(r.id, deleteReminderAction)}
                      disabled={busy}
                      aria-label="Delete reminder"
                      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-danger disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}
