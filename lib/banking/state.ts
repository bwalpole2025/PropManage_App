// Signed OAuth `state` for the bank-link flow. The state round-trips through
// TrueLayer and comes back on the callback; signing it (HMAC over the payload
// with AUTH_SECRET) lets us trust which entity started the flow and blocks CSRF
// — an attacker can't forge a state pointing at someone else's entity.

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const SEP = ".";

interface StatePayload {
  entityId: string;
  linkSessionId: string;
  /** Random nonce so two links for the same entity produce distinct states. */
  nonce: string;
  /** Issued-at (ms) for optional staleness checks on the callback. */
  iat: number;
}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is required to sign bank-link state");
  return s;
}

function b64url(buf: Buffer): string {
  return buf.toString("base64url");
}

function sign(body: string): string {
  return b64url(createHmac("sha256", secret()).update(body).digest());
}

export function signState(input: {
  entityId: string;
  linkSessionId: string;
  nowMs: number;
}): string {
  const payload: StatePayload = {
    entityId: input.entityId,
    linkSessionId: input.linkSessionId,
    nonce: randomBytes(9).toString("base64url"),
    iat: input.nowMs,
  };
  const body = b64url(Buffer.from(JSON.stringify(payload), "utf8"));
  return `${body}${SEP}${sign(body)}`;
}

/** Verify + decode a state string. Returns null if tampered or malformed. */
export function verifyState(state: string): StatePayload | null {
  const idx = state.lastIndexOf(SEP);
  if (idx <= 0) return null;
  const body = state.slice(0, idx);
  const mac = state.slice(idx + 1);

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const json = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (
      typeof json?.entityId === "string" &&
      typeof json?.linkSessionId === "string" &&
      typeof json?.nonce === "string" &&
      typeof json?.iat === "number"
    ) {
      return json as StatePayload;
    }
    return null;
  } catch {
    return null;
  }
}
