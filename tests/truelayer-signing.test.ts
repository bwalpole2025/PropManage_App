import { describe, it, expect } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { signTlRequest } from "@/lib/banking/truelayer-signing";
import {
  verifyTlSignatureWithKeys,
  type Jwk,
} from "@/lib/banking/webhook-signature";

// Prove the request signer is correct by round-tripping it through the verifier:
// sign a Payments request with a P-521 (ES512) private key, then verify the
// Tl-Signature with the matching public JWK — exactly how TrueLayer's edge does.

const KID = "test-signing-kid";
const { publicKey, privateKey } = generateKeyPairSync("ec", { namedCurve: "P-521" });
const jwk: Jwk = { kid: KID, ...(publicKey.export({ format: "jwk" }) as object) } as Jwk;

const METHOD = "POST";
const PATH = "/v3/payments";
const IDEMPOTENCY = "idem-123";
const BODY = JSON.stringify({ amount_in_minor: 125000, currency: "GBP" });

function sign(body = BODY): string {
  return signTlRequest({
    method: METHOD,
    path: PATH,
    body,
    signedHeaders: { "Idempotency-Key": IDEMPOTENCY },
    privateKey,
    kid: KID,
  });
}

describe("signTlRequest", () => {
  it("produces a detached JWS (header..signature)", () => {
    const sig = sign();
    const parts = sig.split(".");
    expect(parts).toHaveLength(3);
    expect(parts[1]).toBe(""); // detached payload
    const header = JSON.parse(Buffer.from(parts[0], "base64url").toString("utf8"));
    expect(header.alg).toBe("ES512");
    expect(header.kid).toBe(KID);
    expect(header.tl_headers).toBe("Idempotency-Key");
  });

  it("verifies against the matching public key", () => {
    const tlSignature = sign();
    const ok = verifyTlSignatureWithKeys(
      {
        tlSignature,
        method: METHOD,
        path: PATH,
        headers: { "Idempotency-Key": IDEMPOTENCY },
        body: BODY,
      },
      [jwk],
    );
    expect(ok).toBe(true);
  });

  it("fails verification when the body is tampered", () => {
    const tlSignature = sign();
    const ok = verifyTlSignatureWithKeys(
      {
        tlSignature,
        method: METHOD,
        path: PATH,
        headers: { "Idempotency-Key": IDEMPOTENCY },
        body: BODY.replace("125000", "999999"),
      },
      [jwk],
    );
    expect(ok).toBe(false);
  });

  it("fails verification when the signed Idempotency-Key changes", () => {
    const tlSignature = sign();
    const ok = verifyTlSignatureWithKeys(
      {
        tlSignature,
        method: METHOD,
        path: PATH,
        headers: { "Idempotency-Key": "different-key" },
        body: BODY,
      },
      [jwk],
    );
    expect(ok).toBe(false);
  });
});
