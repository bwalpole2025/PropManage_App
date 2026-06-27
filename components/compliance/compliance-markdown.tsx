// Minimal, safe markdown renderer for ComplianceRegulation.detailedInfo. The
// guide content uses only a small subset — ### / #### headings, "- " bullets
// (one level of nesting via 2-space indent), **bold**, and [text](url) links —
// so we render that directly to React nodes rather than pulling in a markdown
// dependency or using dangerouslySetInnerHTML.

import * as React from "react";
import { cn } from "@/lib/utils";

const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)]+)\)/g;

/** Render inline **bold** and [text](url) within a single line of text. */
function renderInline(text: string, keyPrefix: string): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      nodes.push(
        <strong key={`${keyPrefix}-b${i}`} className="font-semibold text-foreground">
          {m[1]}
        </strong>,
      );
    } else {
      nodes.push(
        <a
          key={`${keyPrefix}-a${i}`}
          href={m[3]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2 hover:text-primary/80"
        >
          {m[2]}
        </a>,
      );
    }
    last = m.index + m[0].length;
    i += 1;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

interface Bullet {
  depth: number;
  text: string;
}

/** Render `source` markdown as a vertical stack of headings, lists and paragraphs. */
export function ComplianceMarkdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let bullets: Bullet[] = [];
  let key = 0;

  const flushBullets = () => {
    if (bullets.length === 0) return;
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul key={`ul-${key++}`} className="space-y-1.5">
        {items.map((b, idx) => (
          <li
            key={idx}
            className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
            style={{ marginLeft: b.depth * 16 }}
          >
            <span aria-hidden className={cn("select-none", b.depth > 0 ? "text-muted-foreground/60" : "text-primary")}>
              {b.depth > 0 ? "◦" : "•"}
            </span>
            <span className="min-w-0">{renderInline(b.text, `li-${key}-${idx}`)}</span>
          </li>
        ))}
      </ul>,
    );
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    const trimmed = line.trim();

    if (trimmed.length === 0) {
      flushBullets();
      continue;
    }

    const bulletMatch = line.match(/^(\s*)-\s+(.*)$/);
    if (bulletMatch) {
      const depth = Math.min(2, Math.floor(bulletMatch[1].length / 2));
      bullets.push({ depth, text: bulletMatch[2] });
      continue;
    }

    flushBullets();

    if (trimmed.startsWith("#### ")) {
      blocks.push(
        <h4 key={`h4-${key++}`} className="mt-4 text-sm font-semibold text-foreground">
          {renderInline(trimmed.slice(5), `h4-${key}`)}
        </h4>,
      );
    } else if (trimmed.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${key++}`} className="mt-5 text-base font-semibold text-foreground first:mt-0">
          {renderInline(trimmed.slice(4), `h3-${key}`)}
        </h3>,
      );
    } else {
      blocks.push(
        <p key={`p-${key++}`} className="text-sm leading-relaxed text-muted-foreground">
          {renderInline(trimmed, `p-${key}`)}
        </p>,
      );
    }
  }
  flushBullets();

  return <div className={cn("space-y-2", className)}>{blocks}</div>;
}
