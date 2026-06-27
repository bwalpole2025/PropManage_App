import { Prisma } from "@prisma/client";

// Convert a thrown value into a client-safe message. Intentional, user-facing
// Error messages (e.g. "Property not found", "Forbidden: …") pass through so the
// UI stays helpful; database/internal errors are replaced with a generic line so
// Prisma schema details, SQL fragments, file paths and stack frames never reach
// the browser (CWE-209).
export function toClientError(
  e: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (
    e instanceof Prisma.PrismaClientKnownRequestError ||
    e instanceof Prisma.PrismaClientUnknownRequestError ||
    e instanceof Prisma.PrismaClientValidationError ||
    e instanceof Prisma.PrismaClientInitializationError ||
    e instanceof Prisma.PrismaClientRustPanicError
  ) {
    return fallback;
  }
  if (e instanceof Error && e.message) return e.message;
  return fallback;
}
