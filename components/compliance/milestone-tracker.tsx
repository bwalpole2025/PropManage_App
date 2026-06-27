import Link from "next/link";
import {
  Flame,
  Zap,
  Landmark,
  TrendingUp,
  CalendarClock,
  Calculator,
  Scale,
  Info,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RagBadge } from "@/components/compliance/rag";
import type { MilestoneCard, MilestoneKey } from "@/services/compliance/milestones";

const ICONS: Record<MilestoneKey, LucideIcon> = {
  gas: Flame,
  eicr: Zap,
  deposit: Landmark,
  rentIncrease: TrendingUp,
  evictionProtected: CalendarClock,
  tax: Calculator,
};

/** Time-sensitive compliance milestones, one card each. */
export function MilestoneTracker({ cards }: { cards: MilestoneCard[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((card) => (
        <MilestoneTile key={card.key} card={card} />
      ))}
    </div>
  );
}

function MilestoneTile({ card }: { card: MilestoneCard }) {
  const Icon = ICONS[card.key];
  return (
    <Link
      href={card.href}
      className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Icon className="h-4 w-4" />
        </span>
        <RagBadge rag={card.rag} label={card.label} />
      </div>

      <h3 className="mt-3 text-base font-semibold leading-snug tracking-tight">
        {card.title}
      </h3>

      <Badge tone="neutral" className="mt-2 w-fit gap-1">
        <Scale className="h-3 w-3" />
        {card.legalRef}
      </Badge>

      <p className="mt-3 text-sm text-muted-foreground">{card.detail}</p>

      {card.notes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {card.notes.map((note, i) => (
            <li
              key={i}
              className="flex items-start gap-1.5 text-xs text-muted-foreground"
            >
              <Info className="mt-px h-3.5 w-3.5 shrink-0 text-primary" />
              <span>{note}</span>
            </li>
          ))}
        </ul>
      )}

      {card.meta && (
        <p
          className={cn(
            "mt-auto pt-4 text-xs font-medium",
            card.rag === "RED"
              ? "text-danger"
              : card.rag === "AMBER"
                ? "text-warning-foreground"
                : "text-muted-foreground",
          )}
        >
          {card.meta}
        </p>
      )}
    </Link>
  );
}
