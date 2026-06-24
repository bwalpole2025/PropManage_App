// Role -> capability policy. Kept in code (not the DB) so it is easy to audit.
// `Membership.role` gates what an actor can do within a LandlordEntity.

import { MembershipRole } from "../enums";

export const Capability = {
  VIEW: "VIEW",
  MANAGE_PROPERTIES: "MANAGE_PROPERTIES", // properties, tenancies, owners
  MANAGE_TRANSACTIONS: "MANAGE_TRANSACTIONS", // add/edit/categorise
  RUN_TAX: "RUN_TAX",
  SUBMIT_MTD: "SUBMIT_MTD",
  MANAGE_FILES: "MANAGE_FILES",
  MANAGE_MEMBERS: "MANAGE_MEMBERS", // invite / revoke delegated access
  MANAGE_BILLING: "MANAGE_BILLING",
  DELETE_ENTITY: "DELETE_ENTITY",
} as const;
export type Capability = (typeof Capability)[keyof typeof Capability];

const ALL: Capability[] = Object.values(Capability);

const POLICY: Record<MembershipRole, Capability[]> = {
  OWNER: ALL,
  MANAGER: [
    Capability.VIEW,
    Capability.MANAGE_PROPERTIES,
    Capability.MANAGE_TRANSACTIONS,
    Capability.RUN_TAX,
    Capability.SUBMIT_MTD,
    Capability.MANAGE_FILES,
  ],
  ACCOUNTANT: [
    Capability.VIEW,
    Capability.MANAGE_TRANSACTIONS,
    Capability.RUN_TAX,
    Capability.SUBMIT_MTD,
    Capability.MANAGE_FILES,
  ],
  ASSISTANT: [
    Capability.VIEW,
    Capability.MANAGE_PROPERTIES,
    Capability.MANAGE_TRANSACTIONS,
    Capability.RUN_TAX,
    Capability.MANAGE_FILES,
  ],
  VIEWER: [Capability.VIEW],
};

/** Does a role grant a capability? */
export function can(
  role: MembershipRole | string | null | undefined,
  capability: Capability,
): boolean {
  if (!role) return false;
  const caps = POLICY[role as MembershipRole];
  return !!caps && caps.includes(capability);
}

export function capabilitiesFor(role: MembershipRole | string): Capability[] {
  return POLICY[role as MembershipRole] ?? [];
}
