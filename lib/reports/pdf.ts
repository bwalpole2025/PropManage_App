// Dependency-free PDF generator for a ReportDocument. Produces a genuine,
// downloadable PDF (not an HTML print page) using the standard Type1 fonts
// (Helvetica + Courier) so nothing has to be embedded. Tabular data is laid out
// in monospaced Courier with space-padding, which makes column alignment exact
// and robust for any data; on top of that grid we paint a branded header band,
// section accents, a colour-coded summary and zebra-striped tables with real
// hairline rules — the look of a polished accountant's statement.
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
const BOTTOM = MARGIN + 28; // leave room for the footer rule + text
const GAP = 2; // spaces between monospace columns
const GRID_SIZE = 8.5;
const MAX_GRID_CHARS = 98; // fits within usable width at GRID_SIZE in Courier
const COURIER_RATIO = 0.6; // Courier advance width = 0.6em — used for exact x extents
const BAND_H = 92; // branded header band height

type RGB = [number, number, number];
const MUTED: RGB = [0.42, 0.45, 0.5];
const BLACK: RGB = [0.1, 0.11, 0.13];
const ACCENT: RGB = [0.13, 0.38, 0.27]; // brand green
const ACCENT_DARK: RGB = [0.09, 0.27, 0.19];
const WHITE: RGB = [1, 1, 1];
const LIGHT_WHITE: RGB = [0.82, 0.9, 0.85];
const HEADER_FILL: RGB = [0.92, 0.95, 0.93];
const ZEBRA: RGB = [0.972, 0.982, 0.976];
const RULE: RGB = [0.78, 0.82, 0.8];
const INCOME: RGB = [0.13, 0.45, 0.28];
const EXPENSE: RGB = [0.62, 0.22, 0.22];

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

/** Total character width of a monospaced grid row (for exact pixel extents). */
function gridChars(widths: number[]): number {
  return widths.reduce((a, b) => a + b, 0) + GAP * (widths.length - 1);
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

function rgb([r, g, b]: RGB): string {
  return `${r} ${g} ${b}`;
}

function summaryValueColor(it: SummaryItem): RGB {
  if (it.tone === "income") return INCOME;
  if (it.tone === "expense") return EXPENSE;
  if (it.tone === "muted") return MUTED;
  return it.emphasis ? ACCENT : BLACK;
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
  const draw = (x: number, baseline: number, font: FontCode, size: number, color: RGB, text: string) => {
    ops.push(
      `BT /${font} ${size} Tf ${rgb(color)} rg ${x.toFixed(1)} ${baseline.toFixed(1)} Td (${esc(text)}) Tj ET\n`,
    );
  };
  // Filled rectangle (background fills, accent stripes), bottom-left origin.
  const rect = (x: number, yBottom: number, w: number, h: number, color: RGB) => {
    ops.push(`${rgb(color)} rg ${x.toFixed(1)} ${yBottom.toFixed(1)} ${w.toFixed(1)} ${h.toFixed(1)} re f\n`);
  };
  // Thin horizontal hairline drawn as a filled rect (crisp at any zoom).
  const hrule = (x: number, yPos: number, w: number, color: RGB, thick = 0.6) =>
    rect(x, yPos, w, thick, color);

  const line = (text: string, font: FontCode, size: number, color: RGB = BLACK, indent = 0) => {
    const lh = size * 1.34;
    if (y - lh < BOTTOM) flush();
    y -= lh;
    draw(MARGIN + indent, y, font, size, color, text);
  };
  // A monospaced table row with an optional full-width background band behind it.
  const rowLine = (text: string, font: FontCode, size: number, color: RGB, widthPts: number, bg?: RGB) => {
    const lh = size * 1.34;
    if (y - lh < BOTTOM) flush();
    y -= lh;
    if (bg) rect(MARGIN - 4, y - size * 0.3, widthPts + 8, lh, bg);
    draw(MARGIN, y, font, size, color, text);
  };
  const space = (h: number) => {
    y -= h;
    if (y < BOTTOM) flush();
  };

  // --- Branded header band (page 1) ---
  rect(0, PAGE_H - BAND_H, PAGE_W, BAND_H, ACCENT_DARK);
  rect(0, PAGE_H - BAND_H, PAGE_W, 3, ACCENT); // accent stripe along the band's base
  draw(MARGIN, PAGE_H - 30, "F2", 9, WHITE, "PROPMANAGE");
  draw(MARGIN, PAGE_H - 56, "F2", 19, WHITE, doc.title);
  if (doc.subtitle) draw(MARGIN, PAGE_H - 74, "F1", 10.5, LIGHT_WHITE, doc.subtitle);
  y = PAGE_H - BAND_H - 14;

  for (const m of doc.meta ?? []) line(m, "F1", 9, MUTED);

  // --- Sections ---
  for (const section of doc.sections) {
    space(14);
    if (section.title) {
      line(section.title, "F2", 13, BLACK);
      hrule(MARGIN, y - 5, 30, ACCENT, 1.6); // short accent underline
    }
    if (section.description) {
      space(2);
      for (const w of wrap(section.description, 100)) line(w, "F1", 9, MUTED);
    }
    space(4);

    if (section.summary?.length) {
      renderSummary(section.summary, { draw, hrule, advance: (size) => {
        const lh = size * 1.34;
        if (y - lh < BOTTOM) flush();
        y -= lh;
        return y;
      } });
      space(2);
    }

    for (const table of section.tables ?? []) {
      space(8);
      if (table.title) line(table.title, "F2", 10.5, BLACK);
      if (table.rows.length === 0) {
        line(table.emptyText ?? "No data for this selection.", "F1", 9, MUTED);
      } else {
        const widths = computeWidths(table);
        const widthPts = gridChars(widths) * GRID_SIZE * COURIER_RATIO;
        // Header row on a tinted band, with an accent rule beneath.
        rowLine(gridRow(table, widths, (c) => c.label), "F4", GRID_SIZE, ACCENT, widthPts, HEADER_FILL);
        hrule(MARGIN - 4, y - GRID_SIZE * 0.34, widthPts + 8, ACCENT, 0.8);
        // Zebra-striped body rows.
        table.rows.forEach((row, idx) => {
          const bg = idx % 2 === 1 ? ZEBRA : undefined;
          rowLine(gridRow(table, widths, (c) => fmtCell(c, row[c.key])), "F3", GRID_SIZE, BLACK, widthPts, bg);
        });
        // Totals row separated by a hairline.
        if (table.totals) {
          if (y - GRID_SIZE * 1.4 < BOTTOM) flush();
          hrule(MARGIN - 4, y - GRID_SIZE * 0.5, widthPts + 8, RULE, 0.8);
          rowLine(gridRow(table, widths, (c) => fmtCell(c, table.totals![c.key])), "F4", GRID_SIZE, BLACK, widthPts);
        }
      }
      if (table.note) {
        space(1);
        for (const w of wrap(table.note, 110)) line(w, "F1", 8, MUTED);
      }
    }

    const hasTableData = (section.tables ?? []).some((t) => t.rows.length > 0);
    if (!section.summary?.length && !hasTableData && section.emptyText) {
      line(section.emptyText, "F1", 9, MUTED);
    }
  }

  if (doc.disclaimer) {
    space(16);
    hrule(MARGIN, y - 2, PAGE_W - 2 * MARGIN, RULE, 0.6);
    space(8);
    for (const w of wrap(doc.disclaimer, 115)) line(w, "F1", 8, MUTED);
  }

  flush();
  return assemble(pages.length ? pages : [""], doc.title);

  // Summary block: monospaced label/value rows with tone-coloured values and an
  // emphasised (net/total) row set off by a hairline. Closes over draw/hrule/y.
  function renderSummary(
    items: SummaryItem[],
    h: { draw: typeof draw; hrule: typeof hrule; advance: (size: number) => number },
  ) {
    const size = 9.5;
    const charW = size * COURIER_RATIO;
    const labelW = Math.min(50, Math.max(...items.map((it) => it.label.length)));
    const valueOf = (it: SummaryItem) => (it.pence !== undefined ? formatPence(it.pence) : (it.text ?? ""));
    const valueW = Math.max(...items.map((it) => valueOf(it).length), 10);
    const valueX = MARGIN + (labelW + 2) * charW;
    const blockW = (labelW + 2 + valueW) * charW;

    for (const it of items) {
      const baseline = h.advance(size);
      if (it.emphasis) h.hrule(MARGIN, baseline + size * 0.95, blockW, RULE, 0.8);
      h.draw(MARGIN, baseline, it.emphasis ? "F4" : "F3", size, it.emphasis ? BLACK : MUTED, padCell(it.label, labelW, "left"));
      h.draw(valueX, baseline, it.emphasis ? "F4" : "F3", size, summaryValueColor(it), padCell(valueOf(it), valueW, "right"));
    }
  }
}

// --- Low-level PDF assembly (objects, xref, trailer) ---

function assemble(pages: string[], title: string): Uint8Array {
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

  const brand = esc(title);
  pages.forEach((content, p) => {
    const contentObj = firstContentObj + p;
    objects[firstPageObj + p] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] ` +
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R /F3 5 0 R /F4 6 0 R >> >> ` +
      `/Contents ${contentObj} 0 R >>`;
    // Footer: hairline rule, brand mark (left) + page number (right-ish).
    const pageStr = `Page ${p + 1} of ${nPages}`;
    const rightX = PAGE_W - MARGIN - pageStr.length * 4.0;
    const footer =
      `${rgb(RULE)} rg ${MARGIN} ${MARGIN + 6} ${PAGE_W - 2 * MARGIN} 0.6 re f\n` +
      `BT /F2 7.5 Tf ${rgb(ACCENT)} rg ${MARGIN} ${MARGIN - 4} Td (PropManage) Tj ET\n` +
      `BT /F1 7 Tf ${rgb(MUTED)} rg ${MARGIN + 52} ${MARGIN - 4} Td (${brand}) Tj ET\n` +
      `BT /F1 7.5 Tf ${rgb(MUTED)} rg ${rightX.toFixed(1)} ${MARGIN - 4} Td (${esc(pageStr)}) Tj ET\n`;
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
