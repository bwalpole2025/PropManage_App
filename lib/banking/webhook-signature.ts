// Verifies TrueLayer's `Tl-Signature` header so the webhook endpoint only ever
// trusts genuine TrueLayer calls. TrueLayer signs each webhook with a detached
// JWS (ES512 / ECDSA P-521); the public keys live in their JWKS. We rebuild the
// exact signing payload, look up the key by `kid`, and verify.
//
// Scheme (truelayer-signing v2): the signed bytes are
//     "{METHOD} {PATH}\n" + "{Header}: {value}\n" (for each header in tl_headers)
//     + rawBody
// and the JWS signing input is `base64url(protectedHeader).base64url(payload)`.
// Ref: https://docs.truelayer.com/docs/signing-your-requests
//
// We deliberately use Node's built-in crypto (no extra dependency). ECDSA JOSE
// signatures are r||s ("ieee-p1363"), which crypto.verify supports directly.

import { createPublicKey, verify as cryptoVerify, type JsonWebKey } from "node:crypto";

export interface Jwk {
  kid?: string;
  kty: string;
  crv?: string;
  x?: string;
  y?: string;
  alg?: string;
}

export interface VerifyInput {
  tlSignature: string;
  method: string;
  path: string;
  /** Incoming request headers (any casing); looked up case-insensitively. */
  headers: Record<string, string>;
  /** Raw request body exactly as received. */
  body: string;
}

export class WebhookSignatureError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "WebhookSignatureError";
  }
}

interface ProtectedHeader {
  alg: string;
  kid: string;
  tl_version?: string;
  tl_headers?: string;
}

function decodeProtected(b64: string): ProtectedHeader {
  const json = Buffer.from(b64, "base64url").toString("utf8");
  const parsed = JSON.parse(json);
  if (parsed?.alg !== "ES512") {
    throw new WebhookSignatureError(`Unexpected alg: ${parsed?.alg}`);
  }
  if (typeof parsed?.kid !== "string") {
    throw new WebhookSignatureError("Signature header missing kid");
  }
  return parsed as ProtectedHeader;
}

function headerLookup(headers: Record<string, string>): (name: string) => string {
  const lower = new Map<string, string>();
  for (const [k, v] of Object.entries(headers)) lower.set(k.toLowerCase(), v);
  return (name: string) => lower.get(name.toLowerCase()) ?? "";
}

/** Rebuild the exact byte payload TrueLayer signed. */
export function buildSigningPayload(input: VerifyInput, tlHeaders: string): Buffer {
  const get = headerLookup(input.headers);
  let payload = `${input.method.toUpperCase()} ${input.path}\n`;
  if (tlHeaders.trim().length > 0) {
    for (const rawName of tlHeaders.split(",")) {
      const name = rawName.trim();
      if (!name) continue;
      payload += `${name}: ${get(name)}\n`;
    }
  }
  return Buffer.concat([Buffer.from(payload, "utf8"), Buffer.from(input.body, "utf8")]);
}

/**
 * Verify a Tl-Signature. `jwks` supplies the candidate keys (production wires in
 * a cached fetch of TrueLayer's JWKS; tests pass keys directly). Returns true on
 * a valid signature, throws WebhookSignatureError on a malformed header.
 */
export function verifyTlSignatureWithKeys(input: VerifyInput, jwks: Jwk[]): boolean {
  const parts = input.tlSignature.split(".");
  // Detached JWS: "<protected>..<signature>" → ["protected", "", "signature"].
  if (parts.length !== 3) {
    throw new WebhookSignatureError("Malformed Tl-Signature (expected detached JWS)");
  }
  const [protectedB64, , signatureB64] = parts;
  const header = decodeProtected(protectedB64);

  const payload = buildSigningPayload(input, header.tl_headers ?? "");
  const signingInput = Buffer.from(
    `${protectedB64}.${payload.toString("base64url")}`,
    "utf8",
  );
  const signature = Buffer.from(signatureB64, "base64url");

  const candidates = jwks.filter(
    (k) => k.kty === "EC" && (k.kid === header.kid || !k.kid),
  );
  if (candidates.length === 0) {
    throw new WebhookSignatureError(`No JWKS key for kid ${header.kid}`);
  }

  for (const jwk of candidates) {
    try {
      const key = createPublicKey({ key: jwk as JsonWebKey, format: "jwk" });
      const ok = cryptoVerify("sha512", signingInput, { key, dsaEncoding: "ieee-p1363" }, signature);
      if (ok) return true;
    } catch {
      // Try the next candidate key.
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// JWKS fetching (cached). TrueLayer publishes one JWKS for webhook signing.
// ---------------------------------------------------------------------------

const JWKS_TTL_MS = 60 * 60 * 1000; // 1 hour
let jwksCache: { keys: Jwk[]; fetchedAt: number } | null = null;

function jwksUrl(): string {
  return (
    process.env.TRUELAYER_WEBHOOK_JWKS_URL ??
    "https://webhooks.truelayer.com/.well-known/jwks"
  );
}

async function fetchJwks(force: boolean): Promise<Jwk[]> {
  const now = Date.now();
  if (!force && jwksCache && now - jwksCache.fetchedAt < JWKS_TTL_MS) {
    return jwksCache.keys;
  }
  const res = await fetch(jwksUrl());
  if (!res.ok) {
    throw new WebhookSignatureError(`JWKS fetch failed: ${res.status}`);
  }
  const json = (await res.json()) as { keys?: Jwk[] };
  const keys = json.keys ?? [];
  jwksCache = { keys, fetchedAt: now };
  return keys;
}

/**
 * Production entry point: fetch TrueLayer's JWKS (cached) and verify. On a
 * kid-miss we refetch once in case keys rotated.
 */
export async function verifyTlSignature(input: VerifyInput): Promise<boolean> {
  let keys = await fetchJwks(false);
  try {
    return verifyTlSignatureWithKeys(input, keys);
  } catch (e) {
    if (e instanceof WebhookSignatureError && /No JWKS key/.test(e.message)) {
      keys = await fetchJwks(true);
      return verifyTlSignatureWithKeys(input, keys);
    }
    throw e;
  }
}
