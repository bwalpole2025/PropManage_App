"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { StickyNote } from "lucide-react";
import {
  createPropertyNoteAction,
  type PropertyActionState,
} from "@/actions/property";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/input";
import { formatDate } from "@/lib/format";

interface NoteRow {
  id: string;
  description: string;
  date: Date | string;
}

export function PropertyNotes({
  propertyId,
  notes,
  canManage,
}: {
  propertyId: string;
  notes: NoteRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [formKey, setFormKey] = useState(0);
  const [state, action, pending] = useActionState<PropertyActionState, FormData>(
    createPropertyNoteAction.bind(null, propertyId),
    {},
  );

  useEffect(() => {
    // Depend on `state.at` (a fresh per-success nonce) so a second consecutive
    // successful submit still re-fires — a sticky `ok: true` would not change.
    if (state.ok) {
      setFormKey((k) => k + 1); // remount to clear the textarea
      router.refresh();
    }
  }, [state.at, state.ok, router]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between">
        <CardTitle>Notes</CardTitle>
        <StickyNote className="h-5 w-5 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        {canManage ? (
          <form key={formKey} action={action} className="space-y-2">
            <Textarea
              name="description"
              rows={2}
              required
              placeholder="Add a note about this property…"
            />
            {state.error ? (
              <p className="text-sm text-danger">{state.error}</p>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={pending}>
                {pending ? "Saving…" : "Add note"}
              </Button>
            </div>
          </form>
        ) : null}

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-3">
            {notes.map((n) => (
              <li
                key={n.id}
                className="rounded-md border border-border bg-muted/30 p-3"
              >
                <p className="whitespace-pre-wrap text-sm">{n.description}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDate(n.date)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
