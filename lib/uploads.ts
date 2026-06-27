import "server-only";

// Server-side upload validation. `file.type` is browser-supplied and spoofable,
// so this is one layer of defence: it blocks active content types (HTML, SVG,
// scripts) and caps size. Stored files are additionally served with
// `X-Content-Type-Options: nosniff` + a sandbox CSP (see app/api/files/[id]).

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB

// Documents, receipts and compliance certificates: PDFs, common raster images,
// and office/spreadsheet formats. Deliberately excludes text/html, image/svg+xml
// and anything script-bearing.
export const ALLOWED_UPLOAD_MIME = new Set<string>([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

/** Normalised MIME type (lower-cased, parameters stripped). */
export function normalizeMime(type: string | null | undefined): string {
  return (type || "").toLowerCase().split(";")[0]!.trim();
}

/**
 * Asserts `file` is a non-empty File within the size cap and of an allowed
 * content type — throws UploadValidationError otherwise. After this call the
 * value is narrowed to `File`; read the type with `normalizeMime(file.type)`.
 */
export function assertValidUpload(file: unknown): asserts file is File {
  if (!(file instanceof File) || file.size === 0) {
    throw new UploadValidationError("No file provided.");
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new UploadValidationError(
      `File too large — the maximum is ${Math.floor(MAX_UPLOAD_BYTES / (1024 * 1024))} MB.`,
    );
  }
  const mime = normalizeMime(file.type);
  if (!ALLOWED_UPLOAD_MIME.has(mime)) {
    throw new UploadValidationError(
      "Unsupported file type. Allowed: PDF, images (PNG/JPEG/WebP/GIF), Word and Excel/CSV.",
    );
  }
}
