// OAuth `state` for the HMRC authorization redirect. The value is HMAC-signed and
// time-boxed so the callback can verify it was minted by us (CSRF defence) and
// recover which entity/user initiated the flow — without a server-side session.
// Single-use is additionally enforced by persisting the nonce on MtdConnection
// and clearing it in the callback.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { OAUTH_STATE_TTL_MS } from "./constants";

interface StatePayload {
  entityId: string;
  userId: string;
  nonce: string;
  exp: number; // epoch ms
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required to sign the OAuth state");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(body: string): string {
  return createHmac("sha256", secret()).update(body).digest("base64url");
}

/** Mint a signed state token bound to {entityId, userId}. Returns {state, nonce}. */
export function mintState(input: { entityId: string; userId: string }): {
  state: string;
  nonce: string;
} {
  const nonce = b64url(randomBytes(16));
  const payload: StatePayload = {
    entityId: input.entityId,
    userId: input.userId,
    nonce,
    exp: nowMs() + OAUTH_STATE_TTL_MS,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return { state: `${body}.${sign(body)}`, nonce };
}

/** Verify a state token: checks the signature and expiry. Throws on any failure. */
export function verifyState(state: string): {
  entityId: string;
  userId: string;
  nonce: string;
} {
  const [body, mac] = state.split(".");
  if (!body || !mac) throw new Error("Malformed OAuth state");

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new Error("OAuth state signature mismatch");
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    throw new Error("Unreadable OAuth state");
  }
  if (typeof payload.exp !== "number" || payload.exp < nowMs()) {
    throw new Error("OAuth state expired");
  }
  if (!payload.entityId || !payload.userId || !payload.nonce) {
    throw new Error("Incomplete OAuth state");
  }
  return { entityId: payload.entityId, userId: payload.userId, nonce: payload.nonce };
}

// Date.now is injected here so the (rare) test can stub it; runtime uses the real clock.
function nowMs(): number {
  return Date.now();
}
