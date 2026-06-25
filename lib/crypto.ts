// Token-at-rest wrapping for bank-feed provider tokens.
//
// STUB: this demonstrates the token flow — we store only an OPAQUE provider
// token (access/refresh), NEVER raw bank credentials. Production must use a
// managed KMS/HSM and rotate keys; here we use AES-256-GCM with a key from
// TOKEN_ENC_KEY (dev fallback below). Output: base64 of iv(12) | tag(16) | ct.

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const DEV_FALLBACK_KEY = "propmanage-dev-token-key-do-not-use-in-prod";

function key(): Buffer {
  // Derive a stable 32-byte key from the configured secret. Fail CLOSED when a
  // REAL bank provider's tokens are at stake (production + a non-mock provider);
  // the mock provider stores only deterministic non-secret strings, so the dev
  // key is acceptable there (and keeps demos/CI working without the env var).
  const secret = process.env.TOKEN_ENC_KEY;
  if (!secret) {
    const realProvider = (process.env.BANK_FEED_PROVIDER ?? "mock") !== "mock";
    if (process.env.NODE_ENV === "production" && realProvider) {
      throw new Error("TOKEN_ENC_KEY must be set when using a real bank provider");
    }
    return createHash("sha256").update(DEV_FALLBACK_KEY).digest();
  }
  return createHash("sha256").update(secret).digest();
}

/** Encrypt an opaque provider token for storage in `accessTokenEnc`/`refreshTokenEnc`. */
export function encryptToken(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const ct = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString("base64");
}

/** Decrypt a token previously produced by encryptToken. */
export function decryptToken(enc: string): string {
  const buf = Buffer.from(enc, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const ct = buf.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString("utf8");
}
