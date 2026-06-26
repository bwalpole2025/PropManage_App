// Small helpers shared by the report builders: the standard subtitle/meta lines
// so every report's header reads consistently (entity · type, period, portfolio,
// generated date).

import { LandlordType, LandlordTypeLabel } from "@/lib/enums";
import { formatDate } from "@/lib/format";
import type { ReportFilters } from "@/lib/reports/filters";

export interface ReportEntity {
  id: string;
  displayName: string;
  type: string;
}

export function standardSubtitle(entity: ReportEntity): string {
  const typeLabel =
    LandlordTypeLabel[entity.type as keyof typeof LandlordTypeLabel] ?? entity.type;
  return `${entity.displayName} · ${typeLabel}`;
}

export function isCompanyEntity(entity: ReportEntity): boolean {
  return entity.type === LandlordType.LIMITED_COMPANY;
}

export interface MetaOptions {
  /** Period label override (e.g. for tax-year reports use "Tax year: 2024-25"). */
  periodLine?: string;
  /** Portfolio scope name; omitted when the report isn't portfolio-scoped. */
  portfolioName?: string;
  /** Extra lines appended before the generated-at line. */
  extra?: string[];
  /** Inject "now" for deterministic output. */
  now?: Date;
}

/** Build the standard meta (filter-summary) lines for a report header. */
export function standardMeta(filters: ReportFilters, opts: MetaOptions = {}): string[] {
  const lines: string[] = [];
  lines.push(opts.periodLine ?? `Period: ${filters.period.label}`);
  if (opts.portfolioName) lines.push(`Portfolio: ${opts.portfolioName}`);
  for (const e of opts.extra ?? []) lines.push(e);
  lines.push(`Generated: ${formatDate(opts.now ?? new Date())}`);
  return lines;
}
