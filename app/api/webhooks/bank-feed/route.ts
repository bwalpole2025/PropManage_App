import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { services } from "@/lib/services";
import { BankConnStatus } from "@/lib/enums";
import { ingestBankConnection } from "@/lib/bank-ingest";
import { WebhookSignatureError } from "@/lib/banking/webhook-signature";

// Provider push endpoint. Unauthenticated externally: the adapter's handleWebhook
// VERIFIES the provider's signature over the raw body (TrueLayer's Tl-Signature)
// before we trust the event — an unsigned/forged call never reaches ingestion.
// Runs in the Next request (no worker needed).
export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const path = new URL(req.url).pathname;

  let event;
  try {
    event = await services.bankFeed.handleWebhook({
      headers,
      rawBody,
      method: req.method,
      path,
    });
  } catch (e) {
    // A bad/absent signature is an auth failure (401); anything else is a 400.
    if (e instanceof WebhookSignatureError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }

  const connection = await prisma.bankConnection.findFirst({
    where: { providerConnectionId: event.connectionId },
    select: { id: true },
  });
  if (!connection) {
    return NextResponse.json({ ok: true, ignored: "unknown connection" });
  }

  if (event.kind === "CONNECTION_EXPIRED") {
    await prisma.bankConnection.update({
      where: { id: connection.id },
      data: { status: BankConnStatus.EXPIRED },
    });
    revalidatePath("/settings/banking");
    revalidatePath("/transactions");
    return NextResponse.json({ ok: true, expired: true });
  }

  // TRANSACTIONS_AVAILABLE
  const { imported, notified } = await ingestBankConnection(connection.id, {
    notify: true,
  });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  return NextResponse.json({ ok: true, imported, notified });
}
