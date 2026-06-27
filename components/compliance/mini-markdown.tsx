import * as React from "react";
import { cn } from "@/lib/utils";

// A deliberately tiny markdown renderer for the trusted, in-repo compliance copy
// (headings `###`, `**bold**`, `- bullet` lists incl. one level of nesting, and
// `[text](url)` links). Not a general-purpose parser — it only needs to handle
// the subset used in complianceData.ts, with no third-party dependency.

const INLINE = /\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*/g;

function renderInline(text: string, keyBase: string): React.ReactNode[] {
  const out: React.ReactNode[] = [];
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  INLINE.lastIndex = 0;
  while ((m = INLINE.exec(text)) !== null) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) {
      out.push(
        <a
          key={`${keyBase}-a${i}`}
          href={m[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-primary underline underline-offset-2 hover:no-underline"
        >
          {m[1]}
        </a>,
      );
    } else if (m[3] !== undefined) {
      out.push(
        <strong key={`${keyBase}-b${i}`} className="font-semibold text-foreground">
          {m[3]}
        </strong>,
      );
    }
    last = INLINE.lastIndex;
    i++;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

const isBullet = (line: string) => /^\s*-\s+/.test(line);

export function MiniMarkdown({
  source,
  className,
}: {
  source: string;
  className?: string;
}) {
  const lines = source.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let k = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (line.trim() === "") {
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      blocks.push(
        <h4
          key={k++}
          className="mt-5 text-sm font-semibold text-foreground first:mt-0"
        >
          {renderInline(line.slice(4), `h${k}`)}
        </h4>,
      );
      i++;
      continue;
    }

    if (isBullet(line)) {
      const items: { text: string; indent: number }[] = [];
      while (i < lines.length && isBullet(lines[i])) {
        const indent = (lines[i].match(/^\s*/)?.[0].length ?? 0) >= 2 ? 1 : 0;
        items.push({ text: lines[i].replace(/^\s*-\s+/, ""), indent });
        i++;
      }
      blocks.push(
        <ul key={k++} className="space-y-1.5">
          {items.map((it, j) => (
            <li
              key={j}
              className={cn(
                "relative pl-4 before:absolute before:left-0 before:text-muted-foreground/70 before:content-['•']",
                it.indent === 1 && "ml-5",
              )}
            >
              {renderInline(it.text, `li${k}-${j}`)}
            </li>
          ))}
        </ul>,
      );
      continue;
    }

    // Paragraph: join consecutive plain lines until a blank/special line.
    const para = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== "" &&
      !lines[i].startsWith("### ") &&
      !isBullet(lines[i])
    ) {
      para.push(lines[i]);
      i++;
    }
    blocks.push(<p key={k++}>{renderInline(para.join(" "), `p${k}`)}</p>);
  }

  return (
    <div className={cn("space-y-3 text-sm leading-relaxed text-muted-foreground", className)}>
      {blocks}
    </div>
  );
}
