// Structured enforcement + references reference, keyed by the
// ComplianceRegulation.id values in complianceData.ts (the cards generated from
// the PropManage letting guide). Drives two parts of the compliance detail modal:
//   • "Official Resources & Enforcement" — governing body + consequences + guidance.
//   • "References & Further Reading"      — explicit statutory citations, the
//     enforcing body + maximum penalty, and where to make an official inquiry.
// `renewalMonths` (where the duty is periodic) resets the tracking timeline when
// a landlord logs a completed inspection.
//
// General information reflecting the position in England as of June 2026 under
// the Renters' Rights Act 2025 — not legal advice.

export interface OfficialResource {
  label: string;
  href: string;
}

/** A "where to act / inquire" prompt — link when there's a portal, else plain text. */
export interface InquiryPrompt {
  label: string;
  href?: string;
}

export interface RegulationEnforcement {
  /** Regulatory body or forum that enforces / adjudicates this duty. */
  governingBody: string;
  /** Bullet list of the concrete consequences of non-compliance. */
  consequences: string[];
  /** Authoritative gov.uk / regulator links (further reading). */
  resources: OfficialResource[];
  /** Months until the next renewal for a periodic duty (drives timeline reset). */
  renewalMonths?: number;
  /** Explicit statutory citations (Act / section / regulation). */
  statutoryCitations: string[];
  /** Headline maximum penalty for non-compliance. */
  maxPenalty: string;
  /** Where a landlord can make an official inquiry / take action. */
  furtherInquiries: InquiryPrompt[];
}

const ENFORCEMENT: Record<string, RegulationEnforcement> = {
  "epc-mees": {
    governingBody: "Local Housing Authority (Trading Standards) · PRS Exemptions Register",
    consequences: [
      "Civil penalty up to £5,000 per property under current MEES rules (the Warm Homes Plan proposes substantially higher maximums).",
      "You cannot lawfully market, grant or continue a tenancy of a property rated F or G without a registered exemption.",
    ],
    resources: [
      {
        label: "MEES: landlord guidance (gov.uk)",
        href: "https://www.gov.uk/guidance/domestic-private-rented-property-minimum-energy-efficiency-standard-landlord-guidance",
      },
      { label: "Get a new energy certificate (gov.uk)", href: "https://www.gov.uk/get-new-energy-certificate" },
    ],
    renewalMonths: 120,
    statutoryCitations: [
      "Energy Efficiency (Private Rented Property) (England and Wales) Regulations 2015 (MEES)",
      "Energy Performance of Buildings (England and Wales) Regulations 2012",
      "Warm Homes Plan (proposed EPC band C uplift)",
    ],
    maxPenalty: "Up to £5,000 per property under current MEES rules (higher maximums proposed).",
    furtherInquiries: [
      { label: "Order an EPC from an accredited assessor (gov.uk)", href: "https://www.gov.uk/get-new-energy-certificate" },
      { label: "Register a MEES exemption — PRS Exemptions Register", href: "https://prsregister.beis.gov.uk/" },
      { label: "Ask your local council's private-sector housing / energy-efficiency team about enforcement" },
    ],
  },
  "gas-safety": {
    governingBody: "Health and Safety Executive (HSE)",
    consequences: [
      "Criminal offence — an unlimited fine and up to 6 months' imprisonment.",
      "A missing or out-of-date Gas Safety Record undermines reliance on certain possession grounds.",
    ],
    resources: [
      { label: "Gas safety for landlords (HSE)", href: "https://www.hse.gov.uk/gas/landlords/index.htm" },
      { label: "Safety responsibilities (gov.uk)", href: "https://www.gov.uk/renting-out-a-property/health-and-safety" },
    ],
    renewalMonths: 12,
    statutoryCitations: ["Gas Safety (Installation and Use) Regulations 1998, regulation 36"],
    maxPenalty: "Unlimited fine and up to 6 months' imprisonment (criminal offence).",
    furtherInquiries: [
      { label: "Find a Gas Safe registered engineer", href: "https://www.gassaferegister.co.uk/" },
      { label: "Report a gas safety concern to the HSE", href: "https://www.hse.gov.uk/contact/concerns.htm" },
    ],
  },
  "electrical-eicr": {
    governingBody: "Local Housing Authority",
    consequences: [
      "Financial penalty of up to £30,000 per breach.",
      "The local authority can arrange remedial work and recover the cost from you.",
    ],
    resources: [
      {
        label: "Electrical safety standards in the PRS (gov.uk)",
        href: "https://www.gov.uk/guidance/electrical-safety-standards-in-the-private-rented-sector-guidance-for-landlords-tenants-and-local-authorities",
      },
    ],
    renewalMonths: 60,
    statutoryCitations: [
      "Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020",
    ],
    maxPenalty: "Financial penalty up to £30,000 per breach.",
    furtherInquiries: [
      { label: "Find a registered electrician (NICEIC)", href: "https://www.niceic.com/find-a-contractor" },
      { label: "Find a registered electrician (NAPIT)", href: "https://www.napit.org.uk/find-an-installer.aspx" },
      { label: "Ask your local council's private-rented enforcement team about an EICR notice" },
    ],
  },
  "smoke-co-alarms": {
    governingBody: "Local Housing Authority",
    consequences: ["A remedial notice followed by a civil penalty of up to £5,000."],
    resources: [
      {
        label: "Smoke and carbon monoxide alarms: landlord booklet (gov.uk)",
        href: "https://www.gov.uk/government/publications/smoke-and-carbon-monoxide-alarms-explanatory-booklet-for-landlords",
      },
    ],
    renewalMonths: 12,
    statutoryCitations: [
      "Smoke and Carbon Monoxide Alarm (England) Regulations 2015",
      "Smoke and Carbon Monoxide Alarm (Amendment) Regulations 2022",
    ],
    maxPenalty: "Remedial notice and a civil penalty up to £5,000.",
    furtherInquiries: [
      { label: "Contact your local council's housing standards team" },
      {
        label: "Read the landlord alarm requirements (gov.uk)",
        href: "https://www.gov.uk/government/publications/smoke-and-carbon-monoxide-alarms-explanatory-booklet-for-landlords",
      },
    ],
  },
  "tenancy-framework-rra": {
    governingBody: "First-tier Tribunal (Property Chamber) · Local Housing Authority",
    consequences: [
      "Fixed-term / AST drafting is ineffective from 1 May 2026 — such terms are unenforceable.",
      "Failing to provide a written statement of terms can attract local-authority penalties.",
    ],
    resources: [
      { label: "Guide to the Renters' Rights Act (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
      { label: "Renters' Rights Act 2025 (legislation.gov.uk)", href: "https://www.legislation.gov.uk/ukpga/2025" },
    ],
    statutoryCitations: [
      "Renters' Rights Act 2025",
      "Housing Act 1988 (as amended by the Renters' Rights Act 2025)",
    ],
    maxPenalty: "Unenforceable terms; local-authority civil penalties for breaches of the new regime.",
    furtherInquiries: [
      {
        label: "Download a model tenancy agreement (gov.uk)",
        href: "https://www.gov.uk/government/publications/model-agreement-for-a-shorthold-assured-tenancy",
      },
      { label: "Read the Guide to the Renters' Rights Act (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
    ],
  },
  "fees-deposits": {
    governingBody: "Local Housing Authority (Trading Standards) · First-tier Tribunal / County Court",
    consequences: [
      "Prohibited payments: penalty up to £5,000 (up to £30,000 or criminal prosecution for repeat breaches).",
      "Deposit-protection failure: a tenant claim of 1–3× the deposit and invalid possession action.",
    ],
    resources: [
      { label: "Tenant Fees Act 2019 guidance (gov.uk)", href: "https://www.gov.uk/government/publications/tenant-fees-act-2019-guidance" },
      { label: "Tenancy deposit protection (gov.uk)", href: "https://www.gov.uk/tenancy-deposit-protection" },
    ],
    statutoryCitations: [
      "Tenant Fees Act 2019",
      "Housing Act 2004, sections 212–215 (tenancy deposit protection)",
    ],
    maxPenalty: "Prohibited fees up to £5,000 (£30,000 / criminal for repeat); deposit failure 1–3× the deposit.",
    furtherInquiries: [
      { label: "Consult the national tenancy deposit schemes — Deposit Protection Service", href: "https://www.depositprotection.com/" },
      { label: "MyDeposits", href: "https://www.mydeposits.co.uk/" },
      { label: "Tenancy Deposit Scheme (TDS)", href: "https://www.tenancydepositscheme.com/" },
    ],
  },
  "advertising-selection": {
    governingBody: "Local Housing Authority (Trading Standards) · Courts under the Equality Act 2010",
    consequences: [
      "Rental-bidding breaches can attract local-authority civil penalties.",
      "Discriminatory adverts or blanket bans expose you to discrimination claims and damages.",
    ],
    resources: [
      { label: "Guide to the Renters' Rights Act (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
      { label: "Private renting rules (gov.uk)", href: "https://www.gov.uk/private-renting" },
    ],
    statutoryCitations: [
      "Renters' Rights Act 2025 (rental bidding ban)",
      "Equality Act 2010",
      "Housing Act 1988 (as amended)",
    ],
    maxPenalty: "Local-authority civil penalties; uncapped discrimination damages via the courts.",
    furtherInquiries: [
      { label: "Complete a Right to Rent check (gov.uk)", href: "https://www.gov.uk/check-tenant-right-to-rent-documents" },
      { label: "Renting and the Equality Act (gov.uk)", href: "https://www.gov.uk/private-renting" },
    ],
  },
  "repairs-standards": {
    governingBody: "Local Housing Authority (HHSRS) · First-tier Tribunal (Rent Repayment Orders) · Courts",
    consequences: [
      "Council enforcement to remove Category 1 hazards, at your cost.",
      "Rent Repayment Orders of up to 2 years' rent, plus tenant compensation.",
      "Missing an Awaab's Law investigation or repair deadline is itself a breach.",
    ],
    resources: [
      { label: "Landlord responsibilities (gov.uk)", href: "https://www.gov.uk/renting-out-a-property/landlord-responsibilities" },
      { label: "Renters' Rights Act — Awaab's Law (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
    ],
    statutoryCitations: [
      "Landlord and Tenant Act 1985, section 11",
      "Homes (Fitness for Human Habitation) Act 2018",
      "Renters' Rights Act 2025 (Awaab's Law extension to the PRS)",
      "Housing Health and Safety Rating System (HHSRS)",
    ],
    maxPenalty: "Rent Repayment Orders up to 2 years' rent, plus council enforcement and tenant compensation.",
    furtherInquiries: [
      { label: "Report disrepair or a hazard to your local council's environmental health team" },
      { label: "Read the Awaab's Law guidance (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
    ],
  },
  "rent-increases-pets": {
    governingBody: "First-tier Tribunal (Property Chamber)",
    consequences: [
      "An invalid Section 13 increase is unenforceable and can be challenged at the First-tier Tribunal.",
      "Unreasonably refusing a pet, or missing the response window, can be challenged with an award of damages.",
    ],
    resources: [
      { label: "Section 13 rent increases (gov.uk)", href: "https://www.gov.uk/private-renting/rent-increases" },
      { label: "Renters' Rights Act — pets (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
    ],
    renewalMonths: 12,
    statutoryCitations: [
      "Housing Act 1988, section 13 (as amended by the Renters' Rights Act 2025)",
      "Renters' Rights Act 2025 (pet provisions)",
    ],
    maxPenalty: "Increases unenforceable; tenant damages for an unreasonable pet refusal.",
    furtherInquiries: [
      { label: "Serve or challenge a rent increase — First-tier Tribunal (gov.uk)", href: "https://www.gov.uk/housing-tribunals" },
      { label: "Section 13 / Form 4 guidance (gov.uk)", href: "https://www.gov.uk/private-renting/rent-increases" },
    ],
  },
  "ending-tenancy-possession": {
    governingBody: "County Court · First-tier Tribunal · Local Housing Authority (unlawful eviction)",
    consequences: [
      "Recovering possession without a valid Section 8 ground and court order is unlawful eviction — a criminal offence.",
      "Misusing Grounds 1 / 1A bars re-letting or re-marketing the property for 12 months.",
    ],
    resources: [
      { label: "Evicting tenants in England (gov.uk)", href: "https://www.gov.uk/evicting-tenants" },
      { label: "Renters' Rights Act — possession (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
    ],
    statutoryCitations: [
      "Renters' Rights Act 2025 (abolition of Housing Act 1988, section 21)",
      "Housing Act 1988, section 8 grounds (as amended)",
    ],
    maxPenalty: "Unlawful eviction is a criminal offence; 12-month re-letting bar after Grounds 1/1A.",
    furtherInquiries: [
      { label: "Evicting tenants — process and forms (gov.uk)", href: "https://www.gov.uk/evicting-tenants" },
      { label: "Apply for possession — Possession Claim Online", href: "https://www.gov.uk/possession-claim-online-recover-property" },
    ],
  },
  "prs-database-ombudsman": {
    governingBody: "Local Housing Authority · PRS Landlord Ombudsman",
    consequences: [
      "Operating without registration or Ombudsman membership: civil penalties up to £7,000.",
      "Up to £40,000 or criminal prosecution for serious or repeat breaches.",
      "A bar on serving some possession notices until you are registered.",
    ],
    resources: [
      { label: "Renters' Rights Act — database & redress (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
    ],
    statutoryCitations: [
      "Renters' Rights Act 2025 (Private Rented Sector Database)",
      "Renters' Rights Act 2025 (PRS Landlord Ombudsman scheme)",
    ],
    maxPenalty: "Civil penalties up to £7,000, rising to £40,000 or criminal prosecution for serious/repeat breaches.",
    furtherInquiries: [
      { label: "Register on the PRS Database — rolling out from late 2026 (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
      { label: "Check your local council's selective / additional licensing portal" },
    ],
  },
  "mtd-itsa": {
    governingBody: "HM Revenue & Customs (HMRC)",
    consequences: [
      "Late or missing quarterly updates / final declaration attract MTD points-based penalties and interest.",
      "Section 24 restricts finance-cost relief to a 20% basic-rate tax credit, raising the effective tax for higher-rate landlords.",
    ],
    resources: [
      { label: "Using MTD for Income Tax (gov.uk)", href: "https://www.gov.uk/guidance/using-making-tax-digital-for-income-tax" },
      {
        label: "Tax relief for residential landlords (gov.uk)",
        href: "https://www.gov.uk/guidance/changes-to-tax-relief-for-residential-landlords-how-its-worked-out-including-worked-examples",
      },
    ],
    statutoryCitations: [
      "Making Tax Digital for Income Tax Self Assessment (MTD ITSA)",
      "Finance Act 2015, section 24 (finance cost restriction)",
    ],
    maxPenalty: "MTD points-based late-submission penalties plus interest on unpaid tax.",
    furtherInquiries: [
      { label: "Sign up for Making Tax Digital for Income Tax (HMRC)", href: "https://www.gov.uk/guidance/using-making-tax-digital-for-income-tax" },
      {
        label: "Find MTD-compatible software (HMRC)",
        href: "https://www.gov.uk/guidance/find-software-thats-compatible-with-making-tax-digital-for-income-tax",
      },
    ],
  },
};

const FALLBACK: RegulationEnforcement = {
  governingBody: "Local Housing Authority",
  consequences: [
    "Non-compliance may breach your legal obligations and limit your ability to seek possession or claim on insurance.",
  ],
  resources: [{ label: "Guide to the Renters' Rights Act (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" }],
  statutoryCitations: ["Renters' Rights Act 2025"],
  maxPenalty: "Varies — check the linked official guidance for the applicable maximum.",
  furtherInquiries: [
    { label: "Check your local council's private-sector housing pages" },
    { label: "Guide to the Renters' Rights Act (gov.uk)", href: "https://www.gov.uk/guidance/renters-rights-act" },
  ],
};

/** Enforcement reference for a regulation id (never throws — falls back). */
export function enforcementFor(regulationId: string): RegulationEnforcement {
  return ENFORCEMENT[regulationId] ?? FALLBACK;
}
