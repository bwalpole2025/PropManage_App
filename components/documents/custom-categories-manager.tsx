"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteCustomCategoryAction } from "@/actions/document";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatDate } from "@/lib/format";

interface Category {
  id: string;
  name: string;
  documentCount: number;
  createdAt: Date | string;
}

export function CustomCategoriesManager({
  categories,
}: {
  categories: Category[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function remove(id: string) {
    setError(null);
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteCustomCategoryAction(id);
      setBusyId(null);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  if (categories.length === 0) {
    return (
      <EmptyState
        title="No custom categories"
        description="Add a custom category to group documents your own way."
      />
    );
  }

  return (
    <div className="space-y-3">
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <ul className="divide-y divide-border">
        {categories.map((c) => (
          <li key={c.id} className="flex items-center justify-between py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{c.name}</p>
              <p className="text-xs text-muted-foreground">
                Added {formatDate(c.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge tone="neutral">
                {c.documentCount} document{c.documentCount === 1 ? "" : "s"}
              </Badge>
              <button
                type="button"
                onClick={() => remove(c.id)}
                disabled={pending && busyId === c.id}
                className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-danger disabled:opacity-50"
                aria-label={`Delete ${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
