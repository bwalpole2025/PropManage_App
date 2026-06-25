import { describe, it, expect } from "vitest";
import { can, capabilitiesFor, Capability } from "@/lib/auth/rbac";
import { MembershipRole } from "@/lib/enums";

describe("rbac can()", () => {
  it("OWNER has every capability incl. DELETE_ENTITY and MANAGE_MEMBERS", () => {
    expect(can(MembershipRole.OWNER, Capability.DELETE_ENTITY)).toBe(true);
    expect(can(MembershipRole.OWNER, Capability.MANAGE_MEMBERS)).toBe(true);
    expect(can(MembershipRole.OWNER, Capability.SUBMIT_MTD)).toBe(true);
  });

  it("ACCOUNTANT can RUN_TAX/SUBMIT_MTD but not MANAGE_PROPERTIES or MANAGE_MEMBERS", () => {
    expect(can(MembershipRole.ACCOUNTANT, Capability.RUN_TAX)).toBe(true);
    expect(can(MembershipRole.ACCOUNTANT, Capability.SUBMIT_MTD)).toBe(true);
    expect(can(MembershipRole.ACCOUNTANT, Capability.MANAGE_TRANSACTIONS)).toBe(true);
    expect(can(MembershipRole.ACCOUNTANT, Capability.MANAGE_PROPERTIES)).toBe(false);
    expect(can(MembershipRole.ACCOUNTANT, Capability.MANAGE_MEMBERS)).toBe(false);
    expect(can(MembershipRole.ACCOUNTANT, Capability.DELETE_ENTITY)).toBe(false);
  });

  it("VIEWER is read-only", () => {
    expect(can(MembershipRole.VIEWER, Capability.VIEW)).toBe(true);
    expect(can(MembershipRole.VIEWER, Capability.MANAGE_TRANSACTIONS)).toBe(false);
    expect(capabilitiesFor(MembershipRole.VIEWER)).toEqual([Capability.VIEW]);
  });

  it("unknown / null roles deny everything", () => {
    expect(can(null, Capability.VIEW)).toBe(false);
    expect(can(undefined, Capability.VIEW)).toBe(false);
    expect(can("NONSENSE", Capability.VIEW)).toBe(false);
  });
});
