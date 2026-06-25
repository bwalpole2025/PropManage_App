import { describe, it, expect } from "vitest";
import { decryptToken, encryptToken } from "@/lib/crypto";

describe("token crypto", () => {
  it("round-trips an opaque token", () => {
    const token = "mock-access-conn-abc123";
    expect(decryptToken(encryptToken(token))).toBe(token);
  });

  it("uses a random IV (ciphertext differs each call)", () => {
    expect(encryptToken("same")).not.toBe(encryptToken("same"));
  });
});
