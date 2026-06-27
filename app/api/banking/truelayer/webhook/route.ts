// TrueLayer Payments webhook listener (payment settlement, mandate creation,
// etc.). Verifies the `Tl-Signature` header against TrueLayer's production JWKS
// BEFORE trusting the event — an unsigned or forged call is rejected with 401 and
// never reaches any handler. Reuses the same verifier as the bank-feed webhook.

import { NextResponse } from "next/server";
import {
  verifyTlSignature,
  WebhookSignatureError,
} from "@/lib/banking/webhook-signature";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const headers = Object.fromEntries(req.headers.entries());
  const signature = headers["tl-signature"];
  const path = new URL(req.url).pathname;

  if (!signature) {
    return NextResponse.json({ error: "Missing Tl-Signature" }, { status: 401 });
  }

  let valid = false;
  try {
    valid = await verifyTlSignature({
      tlSignature: signature,
      method: req.method,
      path,
      headers,
      body: rawBody,
    });
  } catch (e) {
    if (e instanceof WebhookSignatureError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    throw e;
  }
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Signature verified — the event is genuinely from TrueLayer production.
  let event: { type?: string; event_type?: string } = {};
  try {
    event = JSON.parse(rawBody || "{}");
  } catch {
    return NextResponse.json({ error: "Bad payload" }, { status: 400 });
  }
  const type = (event.type ?? event.event_type ?? "unknown").toString();

  switch (type) {
    case "payment_executed":
    case "payment_settled":
    case "payment_failed":
    case "mandate_created":
    case "mandate_authorized":
    case "mandate_revoked":
      // Plug payment/mandate handlers in here (persist + react). The event is
      // verified at this point, so it is safe to act on.
      console.log(`[truelayer] verified payments webhook: ${type}`);
      break;
    default:
      console.log(`[truelayer] verified payments webhook (unhandled type): ${type}`);
  }

  return NextResponse.json({ ok: true });
}
