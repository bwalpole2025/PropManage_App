import { describe, it, expect } from "vitest";
import { generateKeyPairSync, sign as cryptoSign } from "node:crypto";
import {
  buildSigningPayload,
  verifyTlSignatureWithKeys,
  WebhookSignatureError,
  type Jwk,
  type VerifyInput,
} from "@/lib/banking/webhook-signature";

// Stand in for TrueLayer: a P-521 (ES512) key, exported as a JWKS entry, used to
// sign a webhook exactly the way truelayer-signing v2 does (detached JWS over
// "METHOD PATH\n{headers}\nbody"). Proves our verifier accepts genuine
// signatures and rejects tampering — without touching TrueLayer's live keys.

const KID = "test-kid-1";
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-521" });
const jwk: Jwk = { kid: KID, ...(publicKey.export({ format: "jwk" }) as object) } as Jwk;

const REQUEST: VerifyInput = {
  tlSignature: "", // filled per-test
  method: "POST",
  path: "/api/webhooks/bank-feed",
  headers: {
    "tl-webhook-timestamp": "2026-06-26T07:00:00Z",
    "content-type": "application/json",
  },
  body: JSON.stringify({ type: "transactions", credentials_id: "cred-1" }),
};

function makeSignature(req: VerifyInput, tlHeaders: string): string {
  const protectedHeader = {
    alg: "ES512",
    kid: KID,
    tl_version: "2",
    tl_headers: tlHeaders,
  };
  const protectedB64 = Buffer.from(JSON.stringify(protectedHeader)).toString("base64url");
  const payload = buildSigningPayload(req, tlHeaders);
  const signingInput = Buffer.from(`${protectedB64}.${payload.toString("base64url")}`);
  const signature = cryptoSign("sha512", signingInput, {
    key: privateKey,
    dsaEncoding: "ieee-p1363",
  });
  // Detached JWS: header..signature
  return `${protectedB64}..${signature.toString("base64url")}`;
}

describe("verifyTlSignatureWithKeys", () => {
  it("accepts a correctly signed webhook", () => {
    const tlSignature = makeSignature(REQUEST, "Tl-Webhook-Timestamp");
    expect(verifyTlSignatureWithKeys({ ...REQUEST, tlSignature }, [jwk])).toBe(true);
  });

  it("rejects a tampered body", () => {
    const tlSignature = makeSignature(REQUEST, "Tl-Webhook-Timestamp");
    const tampered = { ...REQUEST, tlSignature, body: REQUEST.body.replace("cred-1", "cred-evil") };
    expect(verifyTlSignatureWithKeys(tampered, [jwk])).toBe(false);
  });

  it("rejects a tampered signed header value", () => {
    const tlSignature = makeSignature(REQUEST, "Tl-Webhook-Timestamp");
    const tampered = {
      ...REQUEST,
      tlSignature,
      headers: { ...REQUEST.headers, "tl-webhook-timestamp": "1999-01-01T00:00:00Z" },
    };
    expect(verifyTlSignatureWithKeys(tampered, [jwk])).toBe(false);
  });

  it("rejects a different path", () => {
    const tlSignature = makeSignature(REQUEST, "Tl-Webhook-Timestamp");
    expect(
      verifyTlSignatureWithKeys({ ...REQUEST, tlSignature, path: "/evil" }, [jwk]),
    ).toBe(false);
  });

  it("throws when no JWKS key matches the kid", () => {
    const tlSignature = makeSignature(REQUEST, "Tl-Webhook-Timestamp");
    const otherKey: Jwk = { kid: "someone-else", kty: "EC", crv: "P-521", x: "a", y: "b" };
    expect(() => verifyTlSignatureWithKeys({ ...REQUEST, tlSignature }, [otherKey])).toThrow(
      WebhookSignatureError,
    );
  });

  it("throws on a malformed signature header", () => {
    expect(() =>
      verifyTlSignatureWithKeys({ ...REQUEST, tlSignature: "not-a-jws" }, [jwk]),
    ).toThrow(WebhookSignatureError);
  });
});
