import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { getActiveContext } from "@/lib/auth/active-org";

// Entity-scoped download. For the mock (filesystem) driver we stream the bytes;
// for S3 we redirect to a short-lived presigned URL.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  let entityId: string;
  try {
    ({ entityId } = await getActiveContext());
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const file = await prisma.fileObject.findFirst({
    where: { id, accountId: entityId },
  });
  if (!file) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (services.storage.driverName === "s3") {
    const url = await services.storage.getSignedUrl(file.storageKey, 300);
    return NextResponse.redirect(url);
  }

  const bytes = await services.storage.getBytes(file.storageKey);
  // Defence in depth against a stored-XSS via an uploaded active document:
  //  - nosniff stops the browser from re-interpreting the declared type;
  //  - the sandbox CSP prevents any script/plugin execution even if an
  //    HTML/SVG payload slipped past the upload allowlist (lib/uploads.ts);
  //  - the filename is stripped of quotes/control chars so it can't break the
  //    Content-Disposition header.
  const safeFilename = file.filename.replace(/[^\w.\- ]+/g, "_");
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": file.mimeType,
      "Content-Disposition": `inline; filename="${safeFilename}"`,
      "Content-Length": String(file.sizeBytes),
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
      "Cache-Control": "private, no-store",
    },
  });
}
