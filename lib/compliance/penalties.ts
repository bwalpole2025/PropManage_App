// Penalty / consequence copy per compliance item, surfaced in alert emails and
// the dashboard so a landlord understands the legal stakes of each breach.
// Plain-English summaries — not legal advice; figures reflect the position under
// the Renters' Rights Act 2025 and the standing letting regulations.

/** The canonical compliance "kinds" the dashboard + jobs reason about. */
export const ComplianceKind = {
  GAS_SAFETY: "GAS_SAFETY",
  EICR: "EICR",
  EPC: "EPC",
  DEPOSIT: "DEPOSIT",
  RIGHT_TO_RENT: "RIGHT_TO_RENT",
  OMBUDSMAN: "OMBUDSMAN",
  PRSD: "PRSD",
  HAZARD: "HAZARD",
  PET: "PET",
  RENT_INCREASE: "RENT_INCREASE",
  CERTIFICATE: "CERTIFICATE", // generic expiring certificate
} as const;
export type ComplianceKind =
  (typeof ComplianceKind)[keyof typeof ComplianceKind];

const PENALTY_COPY: Record<string, string> = {
  GAS_SAFETY:
    "Without a valid annual Gas Safety Certificate (CP12) you cannot rely on Section 21 or several Section 8 possession grounds, and you face criminal liability with an unlimited fine (and up to 6 months' imprisonment).",
  EICR:
    "A missing or expired EICR breaches the Electrical Safety Standards 2020. The local authority can impose a financial penalty of up to £30,000 per breach and arrange remedial work at your cost.",
  EPC:
    "Letting without a valid EPC — minimum band C for new tenancies under the 2025 transitional rules — can attract a civil penalty of up to £30,000 and prevents you from granting or continuing the tenancy lawfully.",
  DEPOSIT:
    "Failing to protect the deposit in an approved scheme AND serve the Prescribed Information within 30 days exposes you to a tenant claim of 1–3× the deposit and makes any Section 21 notice invalid.",
  RIGHT_TO_RENT:
    "Letting to someone without a valid Right to Rent check (or past their permitted leave) risks an unlimited fine and up to 5 years' imprisonment under the Immigration Act 2014.",
  OMBUDSMAN:
    "Operating without PRS Landlord Ombudsman membership is an offence under the Renters' Rights Act 2025, carrying civil penalties up to £7,000 — rising to £40,000 (or criminal prosecution) for repeated or serious breaches.",
  PRSD:
    "Marketing or letting a property that is not registered on the Private Rented Sector Database breaches the Renters' Rights Act 2025 and can attract a civil penalty up to £7,000, plus a bar on serving possession notices.",
  HAZARD:
    "Missing an Awaab's Law deadline to investigate or repair a serious hazard breaches your repairing obligations and can lead to council enforcement, a Rent Repayment Order and tenant compensation.",
  PET:
    "Not responding to a pet request within the statutory window, or refusing one unreasonably, breaches the Renters' Rights Act 2025 and can be challenged by the tenant with an award of damages.",
  RENT_INCREASE:
    "Increasing rent more than once in any 12 months, or without a valid Section 13 notice giving at least two months' notice, makes the increase unenforceable and can be referred to the First-tier Tribunal.",
  CERTIFICATE:
    "Letting without this certificate in date may breach your legal obligations and limit your ability to seek possession or claim on insurance.",
};

export function penaltyFor(kind: string): string {
  return PENALTY_COPY[kind] ?? PENALTY_COPY.CERTIFICATE;
}
