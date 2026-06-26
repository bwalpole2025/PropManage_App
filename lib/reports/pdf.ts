// Dependency-free PDF generator for a ReportDocument. Produces a genuine,
// downloadable PDF (not an HTML print page) using the standard Type1 fonts
// (Helvetica + Courier) so nothing has to be embedded. Tables are laid out in
// monospaced Courier with space-padding, which makes column alignment exact and
// robust for any data — the look of a bank/accountant statement.
//
// Pure (no prisma/React): takes a ReportDocument, returns the PDF bytes. The same
// document drives the on-screen view (components/reports/report-view) and CSV
// (lib/reports/csv), so all three outputs always agree.

import { formatDate, formatPence } from "@/lib/format";
import {
  columnAlign,
  type CellValue,
  type ReportColumn,
  type ReportDocument,
  type ReportTable,
  type SummaryItem,
} from "./types";

const PAGE_W = 595;
const PAGE_H = 842;
const MARGIN = 42;
const TOP = PAGE_H - MARGIN;
const BOTTOM = MARGIN + 24; // leave room for the page-number footer
const GAP = 2; // spaces between monospace columns
const GRID_SIZE = 8.5;
const MAX_GRID_CHARS = 98; // fits within usable width at GRID_SIZE in Courier

const MUTED: [number, number, number] = [0.42, 0.45, 0.5];
const BLACK: [number, number, number] = [0, 0, 0];

type FontCode = "F1" | "F2" | "F3" | "F4"; // Helvetica, Helvetica-Bold, Courier, Courier-Bold

// Escape a string for a PDF literal and map the handful of non-ASCII characters
// our formatters emit (£, en/em dashes, curly quotes, ellipsis) to their
// WinAnsiEncoding code points as octal escapes; anything else non-ASCII → '?'.
function esc(input: string): string {
  let out = "";
  for (const ch of input) {
    const code = ch.codePointAt(0)!;
    if (ch === "\\") out += "\\\\";
    else if (ch === "(") out += "\\(";
    else if (ch === ")") out += "\\)";
    else if (code < 0x80) out += ch;
    else {
      const winAnsi = WINANSI_SPECIAL[code] ?? (code >= 0xa0 && code <= 0xff ? code : null);
      out += winAnsi === null ? "?" : "\\" + winAnsi.toString(8).padStart(3, "0");
    }
  }
  return out;
}

const WINANSI_SPECIAL: Record<number, number> = {
  0x2013: 0x96, // – en dash
  0x2014: 0x97, // — em dash
  0x2018: 0x91, // ' left single quote
  0x2019: 0x92, // ' right single quote
  0x201c: 0x93, // " left double quote
  0x201d: 0x94, // " right double quote
  0x2026: 0x85, // … ellipsis
  0x2022: 0x95, // • bullet
};

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(2);
}

/** Format a cell value for the monospaced grid by column type. */
function fmtCell(col: ReportColumn, value: CellValue): string {
  if (value === null || value === undefined) return "";
  if (col.type === "currency") return typeof value === "number" ? formatPence(value) : String(value);
  if (col.type === "number") return typeof value === "number" ? fmtNum(value) : String(value);
  if (col.type === "date") return value instanceof Date ? formatDate(value) : String(value);
  return value instanceof Date ? formatDate(value) : String(value);
}

function padCell(text: string, width: number, align: "left" | "right" | "center"): string {
  let t = text;
  if (t.length > width) t = width > 1 ? t.slice(0, width - 1) + "…" : t.slice(0, width);
  const space = width - t.length;
  if (space <= 0) return t;
  if (align === "right") return " ".repeat(space) + t;
  if (align === "center") {
    const left = Math.floor(space / 2);
    return " ".repeat(left) + t + " ".repeat(space - left);
  }
  return t + " ".repeat(space);
}

/** Natural column widths (in chars), shrunk to fit MAX_GRID_CHARS by trimming text columns. */
function computeWidths(table: ReportTable): number[] {
  const widths = table.columns.map((c) => {
    let w = c.label.length;
    for (const row of table.rows) w = Math.max(w, fmtCell(c, row[c.key]).length);
    if (table.totals) w = Math.max(w, fmtCell(c, table.totals[c.key]).length);
    return Math.max(w, c.widthChars ?? 1);
  });

  const total = () => widths.reduce((a, b) => a + b, 0) + GAP * (widths.length - 1);
  let overflow = total() - MAX_GRID_CHARS;
  if (overflow > 0) {
    const shrinkable = table.columns
      .map((c, i) => ({ c, i }))
      .filter((x) => !x.c.type || x.c.type === "text")
      .map((x) => x.i);
    let guard = 2000;
    while (overflow > 0 && guard-- > 0) {
      let best = -1;
      let bestW = 0;
      for (const i of shrinkable) {
        if (widths[i] > 8 && widths[i] > bestW) {
          bestW = widths[i];
          best = i;
        }
      }
      if (best < 0) break;
      widths[best] -= 1;
      overflow -= 1;
    }
  }
  return widths;
}

function gridRow(table: ReportTable, widths: number[], cells: (col: ReportColumn) => string): string {
  return table.columns.map((c, i) => padCell(cells(c), widths[i], columnAlign(c))).join(" ".repeat(GAP));
}

function wrap(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    if (line.length === 0) line = w;
    else if (line.length + 1 + w.length <= maxChars) line += " " + w;
    else {
      lines.push(line);
      line = w;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function rgb([r, g, b]: [number, number, number]): string {
  return `${r} ${g} ${b}`;
}

/** Render a ReportDocument to PDF bytes. */
export function reportToPdf(doc: ReportDocument): Uint8Array {
  const pages: string[] = [];
  let ops: string[] = [];
  let y = TOP;

  const flush = () => {
    if (ops.length) pages.push(ops.join(""));
    ops = [];
    y = TOP;
  };
  const draw = (
    x: number,
    baseline: number,
    font: FontCode,
    size: number,
    color: [number, number, number],
    text: string,
  ) => {
    ops.push(
      `BT /${font} ${size} Tf ${rgb(color)} rg ${x.toFixed(1)} ${baseline.toFixed(1)} Td (${esc(text)}) Tj ET\n`,
    );
  };
  const line = (
    text: string,
    font: FontCode,
    size: number,
    color: [number, number, number] = BLACK,
    indent = 0,
  ) => {
    const lh = size * 1.34;
    if (y - lh < BOTTOM) flush();
    y -= lh;
    draw(MARGIN + indent, y, font, size, color, text);
  };
  const space = (h: number) => {
    y -= h;
    if (y < BOTTOM) flush();
  };

  // --- Header ---
  line(doc.title, "F2", 17);
  if (doc.subtitle) line(doc.subtitle, "F1", 10.5, MUTED);
  space(3);
  for (const m of doc.meta ?? []) line(m, "F1", 9, MUTED);

  // --- Sections ---
  for (const section of doc.sections) {
    space(12);
    if (section.title) line(section.title, "F2", 13);
    if (section.description) {
      for (const w of wrap(section.description, 100)) line(w, "F1", 9, MUTED);
    }
    space(3);

    if (section.summary?.length) {
      renderSummary(section.summary, line);
      space(2);
    }

    for (const table of section.tables ?? []) {
      space(6);
      if (table.title) line(table.title, "F2", 10.5);
      if (table.rows.length === 0) {
        line(table.emptyText ?? "No data for this selection.", "F1", 9, MUTED);
      } else {
        const widths = computeWidths(table);
        line(gridRow(table, widths, (c) => c.label), "F4", GRID_SIZE);
        line(widths.map((w) => "-".repeat(w)).join(" ".repeat(GAP)), "F3", GRID_SIZE, MUTED);
        for (const row of table.rows) {
          line(gridRow(table, widths, (c) => fmtCell(c, row[c.key])), "F3", GRID_SIZE);
        }
        if (table.totals) {
          line(widths.map((w) => "-".repeat(w)).join(" ".repeat(GAP)), "F3", GRID_SIZE, MUTED);
          line(gridRow(table, widths, (c) => fmtCell(c, table.totals![c.key])), "F4", GRID_SIZE);
        }
      }
      if (table.note) {
        for (const w of wrap(table.note, 110)) line(w, "F1", 8, MUTED);
      }
    }

    const hasTableData = (section.tables ?? []).some((t) => t.rows.length > 0);
    if (!section.summary?.length && !hasTableData && section.emptyText) {
      line(section.emptyText, "F1", 9, MUTED);
    }
  }

  if (doc.disclaimer) {
    space(14);
    for (const w of wrap(doc.disclaimer, 115)) line(w, "F1", 8, MUTED);
  }

  flush();
  return assemble(pages.length ? pages : [""]);
}

function renderSummary(items: SummaryItem[], line: (t: string, f: FontCode, s: number, c?: [number, number, number], i?: number) => void) {
  const labelW = Math.min(48, Math.max(...items.map((it) => it.label.length)));
  const valueOf = (it: SummaryItem) => (it.pence !== undefined ? formatPence(it.pence) : (it.text ?? ""));
  const valueW = Math.max(...items.map((it) => valueOf(it).length), 8);
  for (const it of items) {
    const row = padCell(it.label, labelW, "left") + "  " + padCell(valueOf(it), valueW, "right");
    line(row, it.emphasis ? "F4" : "F3", 9.5, it.emphasis ? BLACK : MUTED);
  }
}

// --- Low-level PDF assembly (objects, xref, trailer) ---

function assemble(pages: string[]): Uint8Array {
  const nPages = pages.length;
  // 1 catalog, 2 pages, 3-6 fonts, then page objects, then content objects.
  const FONT_OBJS = 4;
  const firstPageObj = 3 + FONT_OBJS; // 7
  const firstContentObj = firstPageObj + nPages;
  const objCount = firstContentObj + nPages; // total objects + 1 (for index 0)

  const objects: string[] = new Array(objCount).fill("");
  objects[1] = `<< /Type /Catalog /Pages 2 0 R >>`;
  const kids = Array.from({ length: nPages }, (_, p) => `${firstPageObj + p} 0 R`).join(" ");
  objects[2] = `<< /Type /Pages /Kids [${kids}] /Count ${nPages} >>`;
  const fonts = ["Helvetica", "Helvetica-Bold", "Courier", "Courier-Bold"];
  fonts.forEach((bf, i) => {
    objects[3 + i] = `<< /Type /Font /Subtype /Type1 /BaseFont /${bf} /Encoding /WinAnsiEncoding >>`;
  });

  pages.forEach((content, p) => {
    const contentObj = firstContentObj + p;
    objects[firstPageObj + p] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> ` +
      `/Contents ${contentObj} 0 R >>`;
    // Page-number footer drawn at the very bottom.
    const footer = `BT /F1 8 Tf ${rgb(MUTED)} rg ${MARGIN} ${MARGIN - 6} Td (${esc(`Page ${p + 1} of ${nPages}`)}) Tj ET\n`;
    const stream = content + footer;
    const len = Buffer.byteLength(stream, "latin1");
    objects[contentObj] = `<< /Length ${len} >>\nstream\n${stream}\nendstream`;
  });

  let pdf = "%PDF-1.4\n";
  const offsets: number[] = new Array(objCount).fill(0);
  for (let i = 1; i < objCount; i++) {
    offsets[i] = Buffer.byteLength(pdf, "latin1");
    pdf += `${i} 0 obj\n${objects[i]}\nendobj\n`;
  }
  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objCount}\n`;
  pdf += `0000000000 65535 f \n`;
  for (let i = 1; i < objCount; i++) {
    pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objCount} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new Uint8Array(Buffer.from(pdf, "latin1"));
}
