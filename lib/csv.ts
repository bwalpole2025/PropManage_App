// Tiny dependency-free CSV reader/writer (RFC-4180-ish). Handles quoted fields
// with embedded commas, newlines and escaped "" quotes; tolerates CRLF or LF.

/** Parse CSV text into rows of string cells. Trailing blank line is ignored. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;

  // Strip a UTF-8 BOM if present.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += ch;
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (ch === ",") {
      pushField();
      i++;
      continue;
    }
    if (ch === "\r") {
      // CRLF or lone CR ends the row.
      pushRow();
      if (text[i + 1] === "\n") i++;
      i++;
      continue;
    }
    if (ch === "\n") {
      pushRow();
      i++;
      continue;
    }
    field += ch;
    i++;
  }
  // Flush the final field/row unless the input ended on a row break with nothing after.
  if (field.length > 0 || row.length > 0) pushRow();

  // Drop a trailing fully-empty row (e.g. file ended with a newline).
  if (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === "") {
    rows.pop();
  }
  return rows;
}

function escapeCell(value: string | number): string {
  const s = String(value ?? "");
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialise rows of cells into CSV text (CRLF line endings). */
export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(escapeCell).join(",")).join("\r\n");
}
