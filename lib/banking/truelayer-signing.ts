// TrueLayer request signing (Tl-Signature) for the Payments API. Live payment /
// mandate requests must carry a detached-JWS `Tl-Signature` header (ES512 over
// EC P-521) covering the HTTP method, path, the signed request headers (the
// Idempotency-Key) and the body.
//
// This is the SIGNING counterpart to webhook-signature.ts (which VERIFIES inbound
// signatures); both reuse buildSigningPayload() so the canonicalisation can never
// drift between signing and verifying.
//
// Key handling: you generate an EC P-521 key pair, upload the PUBLIC key in the
// TrueLayer console and receive a `kid`. The PRIVATE key + kid are read from env
// (TRUELAYER_PRIVATE_KEY, TRUELAYER_KID) — the private key never leaves the server.

import { createPrivateKey, sign as cryptoSign, type KeyObject } from "node:crypto";
import { buildSigningPayload } from "./webhook-signature";

export class TrueLayerSigningError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TrueLayerSigningError";
  }
}

let cachedKey: { key: KeyObject; kid: string } | null = null;

/**
 * Load the EC private signing key + kid from env. Env vars can't hold raw
 * newlines, so we accept either a `\n`-escaped PEM or a base64-encoded PEM.
 */
export function loadSigningKey(): { key: KeyObject; kid: string } {
  if (cachedKey) return cachedKey;

  const kid = process.env.TRUELAYER_KID;
  let pem = process.env.TRUELAYER_PRIVATE_KEY;
  if (!pem || !kid) {
    throw new TrueLayerSigningError(
      "TRUELAYER_PRIVATE_KEY and TRUELAYER_KID are required for signed (Payments API) requests",
    );
  }

  pem = pem.trim();
  // Allow a base64-wrapped PEM (no header) — decode it back to text first.
  if (!pem.includes("-----BEGIN")) {
    pem = Buffer.from(pem, "base64").toString("utf8");
  }
  pem = pem.replace(/\\n/g, "\n");

  try {
    const key = createPrivateKey(pem);
    cachedKey = { key, kid };
    return cachedKey;
  } catch {
    throw new TrueLayerSigningError("TRUELAYER_PRIVATE_KEY is not a valid EC private key");
  }
}

export interface SignRequestInput {
  /** HTTP method, e.g. "POST". */
  method: string;
  /** Request path that will be hit, e.g. "/v3/payments". */
  path: string;
  /** Exact JSON string sent as the body (must be byte-identical to the request). */
  body: string;
  /** Headers included in the signature — TrueLayer requires the Idempotency-Key. */
  signedHeaders: Record<string, string>;
  /** Explicit key/kid (used by tests); otherwise loaded from env. */
  privateKey?: KeyObject;
  kid?: string;
}

/**
 * Produce the `Tl-Signature` header value: a detached JWS (header..signature)
 * signed with ES512 in JOSE (r||s) form.
 */
export function signTlRequest(input: SignRequestInput): string {
  const { key, kid } =
    input.privateKey && input.kid
      ? { key: input.privateKey, kid: input.kid }
      : loadSigningKey();

  const tlHeaders = Object.keys(input.signedHeaders).join(",");
  const protectedHeader = {
    alg: "ES512",
    kid,
    tl_version: "2",
    tl_headers: tlHeaders,
  };
  const protectedB64 = Buffer.from(JSON.stringify(protectedHeader)).toString("base64url");

  // Reuse the verifier's canonical payload builder (single source of truth).
  const payload = buildSigningPayload(
    {
      tlSignature: "",
      method: input.method,
      path: input.path,
      headers: input.signedHeaders,
      body: input.body,
    },
    tlHeaders,
  );

  const signingInput = Buffer.from(
    `${protectedB64}.${payload.toString("base64url")}`,
    "utf8",
  );
  const signature = cryptoSign("sha512", signingInput, {
    key,
    dsaEncoding: "ieee-p1363",
  });

  // Detached JWS: protected header, empty payload, signature.
  return `${protectedB64}..${signature.toString("base64url")}`;
}
