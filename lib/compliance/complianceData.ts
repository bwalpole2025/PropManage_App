// Reference data: the core UK landlord compliance regulations, encoded from the
// PropManage letting guide ("A Landlord's Guide to Renting Out a Property",
// June 2026). Accurate to the legal position in England as of June 2026 — i.e.
// with the Renters' Rights Act 2025 in force (main tenancy reforms from 1 May
// 2026), Making Tax Digital for Income Tax in its phased rollout, and the Warm
// Homes Plan EPC uplift confirmed (band C by 1 October 2030) but not yet in force.
//
// Each card is structured as a bite-sized `summary` followed by an actionable
// `keyPoints` checklist (the strict duties, deadlines and monetary thresholds),
// with `detailedInfo` holding the full markdown deep-dive and official links.
//
// This is structured general information to drive the in-app compliance guide —
// it is NOT legal or tax advice. Always check the linked official guidance, which
// is the authoritative source.

/** The five guide categories, in the order a let runs from pre-let to possession. */
export type RegulationCategory =
  | "Pre-Let Safety"
  | "Tenancy Setup"
  | "During Tenancy"
  | "Tax & Registration"
  | "Possession";

/** Seed status for a regulation card before any property-specific data is applied. */
export type RegulationDefaultStatus =
  | "compliant"
  | "action_required"
  | "upcoming_duty";

export interface ComplianceRegulation {
  /** Stable kebab-case identifier. */
  id: string;
  /** Short human title. */
  title: string;
  /** Which stage of the letting lifecycle this belongs to. */
  category: RegulationCategory;
  /** Exact act / regulation name(s). */
  legalReference: string;
  /** One-sentence statement of the core duty. */
  keyRequirement: string;
  /**
   * A concise 2–3 sentence overview: what the regulation is and who it applies
   * to. Authoritative, plain-but-precise guidance for housing providers.
   */
  summary: string;
  /**
   * Actionable checklist — the strict duties, deadlines and monetary thresholds
   * a landlord must meet. Each entry is a single, self-contained obligation.
   */
  keyPoints: string[];
  /** Full rules, citations and official guidance links (markdown). */
  detailedInfo: string;
  /** Human timeline or a date-calculation rule the engine can apply. */
  timeline: string;
  /** Default RAG-style status before property data refines it. */
  defaultStatus: RegulationDefaultStatus;
}

/** Display order for the five categories. */
export const REGULATION_CATEGORIES: RegulationCategory[] = [
  "Pre-Let Safety",
  "Tenancy Setup",
  "During Tenancy",
  "Possession",
  "Tax & Registration",
];

export const complianceRegulations: ComplianceRegulation[] = [
  // -------------------------------------------------------------------------
  // Pre-Let Safety
  // -------------------------------------------------------------------------
  {
    id: "epc-mees",
    title: "Energy Performance (EPC) & Minimum Energy Efficiency Standard",
    category: "Pre-Let Safety",
    legalReference:
      "Energy Efficiency (Private Rented Property) (England and Wales) Regulations 2015 (MEES); Energy Performance of Buildings (England and Wales) Regulations 2012; Warm Homes Plan (confirmed January 2026)",
    keyRequirement:
      "Hold a valid EPC to market and let, and show the rating in adverts. The minimum rating to let is currently band E; under the Warm Homes Plan it rises to the equivalent of EPC band C for all private tenancies by 1 October 2030, subject to a £10,000-per-property spending cap.",
    summary:
      "An Energy Performance Certificate rates a property's energy efficiency from A to G, must be shown in any advertisement and given to the tenant, and is valid for ten years. Under the Minimum Energy Efficiency Standard (MEES) it is currently unlawful to let, or continue to let, a property rated below band E unless a valid exemption is registered. The minimum rises to the equivalent of EPC band C for all private tenancies by 1 October 2030, subject to a spending cap.",
    keyPoints: [
      "Hold a valid EPC before marketing, show the rating in every advertisement, and give the certificate to the tenant — an EPC lasts 10 years.",
      "The minimum rating to let is currently band E; letting below E (band F or G) is unlawful unless a valid exemption is registered on the national exemptions register.",
      "The minimum rises to the equivalent of EPC band C for all private tenancies by 1 October 2030, subject to a £10,000-per-property spending cap (or 10% of the property's value where that is lower).",
      "Spending on qualifying improvements from October 2025 already counts towards the cap — plan works early and keep evidence of spend.",
      "A new energy-efficiency assessment methodology becomes mandatory for EPCs on 1 October 2029.",
      "Exemptions must be registered (generally lasting five years) and the property must still hold a valid EPC — an exemption is the exception, not a route to avoid the standard.",
    ],
    detailedInfo: `### What the law requires now
- You must have a valid **Energy Performance Certificate (EPC)** before marketing a property to let, **show the rating in any advertisement**, and provide the certificate to the tenant. An EPC is valid for **10 years**.
- Under the **Minimum Energy Efficiency Standard (MEES)** it is currently **unlawful to let, or continue to let, a property rated below band E** — unless a valid exemption is registered on the national exemptions register.

### The Warm Homes Plan uplift (confirmed January 2026, not yet in force)
- All privately rented homes in England and Wales must reach the equivalent of **EPC band C by 1 October 2030**.
- A **spending cap of £10,000 per property** applies (**or 10% of the property's value where that is lower**) — once you have spent up to the cap on qualifying improvements you can register an exemption if band C is still not met.
- A **new energy-efficiency assessment methodology** takes over from late 2027 and becomes **mandatory on 1 October 2029**.
- Plan ahead now: spending from **October 2025 already counts towards the cap**, so commission improvements early and keep evidence of spend.

### Exemptions
- A limited set of exemptions exists (for example all relevant improvements made but the property still falls short, work exceeding the cost cap, or a third-party consent unreasonably refused). They **must be registered on the national exemptions register and generally last five years**, and the property must still have a valid EPC.

### Penalties
- Current MEES breaches can attract civil penalties (up to £5,000 per property under the existing rules); the Warm Homes Plan proposes substantially higher maximum penalties.

### Official guidance
- [Domestic private rented property: minimum energy efficiency standard (gov.uk)](https://www.gov.uk/guidance/domestic-private-rented-property-minimum-energy-efficiency-standard-landlord-guidance)
- [Get a new energy certificate (gov.uk)](https://www.gov.uk/get-new-energy-certificate)`,
    timeline:
      "EPC valid 10 years. Minimum band E in force now. New assessment methodology mandatory from 1 October 2029; minimum band C for all private tenancies by 1 October 2030 (£10,000 cost cap, or 10% of value where lower).",
    defaultStatus: "upcoming_duty",
  },
  {
    id: "gas-safety",
    title: "Annual Gas Safety Check",
    category: "Pre-Let Safety",
    legalReference:
      "Gas Safety (Installation and Use) Regulations 1998 (regulation 36)",
    keyRequirement:
      "Have every gas appliance and flue checked at least every 12 months by a Gas Safe registered engineer. Give the Gas Safety Record to existing tenants within 28 days of the check, and to new tenants before they move in.",
    summary:
      "Where a property has gas appliances, pipework or flues, the landlord must arrange an annual gas safety check by a Gas Safe registered engineer under the Gas Safety (Installation and Use) Regulations 1998. A copy of the resulting record must be given to the tenant within strict deadlines and retained. The duty is enforced as a criminal matter, and a failure that contributes to a tenant's death can lead to prosecution for manslaughter.",
    keyPoints: [
      "Arrange a gas safety check of every gas appliance, fitting and flue at least every 12 months, carried out by a Gas Safe registered engineer.",
      "Give the gas safety record (LGSR / CP12) to existing tenants within 28 days of the check.",
      "Give the record to any new tenant before they move in.",
      "Keep gas safety records for inspection (at least two years).",
      "Enforced by the Health and Safety Executive — breaches carry penalties, and a failure contributing to a death can lead to a manslaughter prosecution.",
    ],
    detailedInfo: `### Core duty
- Arrange an **annual gas safety check** (within **12 months**) of every gas appliance, fitting and flue by a **Gas Safe registered engineer**.
- You receive a **Landlord Gas Safety Record (LGSR / CP12)**.

### The 28-day copy rule
- Give a copy of the record to **existing tenants within 28 days** of the check.
- Give it to **new tenants before they move in**.
- **Keep records for at least 2 years.**

### Why it matters
- Enforced by the **Health and Safety Executive (HSE)**. Breaches are a criminal offence carrying an **unlimited fine and up to 6 months' imprisonment**; a failure that contributes to a tenant's death can lead to prosecution for manslaughter.
- A missing or out-of-date record undermines your ability to rely on certain possession grounds.

### Official guidance
- [Gas safety for landlords (HSE)](https://www.hse.gov.uk/gas/landlords/index.htm)
- [Renting out your property: safety responsibilities (gov.uk)](https://www.gov.uk/renting-out-a-property/health-and-safety)`,
    timeline:
      "Recurring every 12 months. Record to existing tenants within 28 days of the check; to new tenants before occupation. Keep records 2 years.",
    defaultStatus: "action_required",
  },
  {
    id: "electrical-eicr",
    title: "Electrical Installation Condition Report (EICR)",
    category: "Pre-Let Safety",
    legalReference:
      "Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020",
    keyRequirement:
      "Have fixed electrical installations inspected and tested at least every 5 years by a qualified person, supply the EICR to tenants, and carry out any remedial work the report identifies (usually within 28 days).",
    summary:
      "The fixed electrical installation in a rented property must be inspected and tested at least every five years by a qualified person, under the Electrical Safety Standards in the Private Rented Sector (England) Regulations 2020. The resulting Electrical Installation Condition Report (EICR) must be supplied to tenants and to the local authority on request, and any remedial work carried out. Local authorities can impose financial penalties of up to £30,000 for a breach.",
    keyPoints: [
      "Have the fixed electrical installation inspected and tested at least every 5 years (or sooner if the report specifies) by a qualified, competent person.",
      "Supply a copy of the EICR to tenants, and to the local authority on request.",
      "Carry out any remedial or further investigative work the report identifies, usually within 28 days, and obtain written confirmation it is complete.",
      "Keep any electrical appliances the landlord supplies in safe working order.",
      "Local authorities can impose a financial penalty of up to £30,000 per breach and arrange remedial work at your expense.",
    ],
    detailedInfo: `### Core duty
- Ensure the **fixed electrical installations** are inspected and tested **at least every 5 years** (or sooner if the report specifies) by a **qualified and competent person**.
- The result is an **Electrical Installation Condition Report (EICR)**, which must be rated **satisfactory**.

### Distribution & remedial deadlines
- Give the report to **tenants**, and to the **local authority on request**.
- Carry out any **remedial or further investigative work**, usually **within 28 days** (or sooner if the report requires), and obtain written confirmation it is complete.

### Penalty
- Local authorities can impose a financial penalty of **up to £30,000 per breach** and arrange remedial work at your expense.

### Official guidance
- [Electrical safety standards in the private rented sector (gov.uk)](https://www.gov.uk/guidance/electrical-safety-standards-in-the-private-rented-sector-guidance-for-landlords-tenants-and-local-authorities)`,
    timeline:
      "At least every 5 years (or sooner if specified). EICR to tenants and to the local authority on request; remedial works usually within 28 days.",
    defaultStatus: "action_required",
  },
  {
    id: "smoke-co-alarms",
    title: "Smoke & Carbon Monoxide Alarms",
    category: "Pre-Let Safety",
    legalReference:
      "Smoke and Carbon Monoxide Alarm (England) Regulations 2015 (as amended 2022)",
    keyRequirement:
      "Provide a working smoke alarm on every storey used as living accommodation, and a carbon monoxide alarm in every room with a fixed combustion appliance (excluding gas cookers). Ensure all alarms work at the start of each tenancy.",
    summary:
      "The landlord must fit a working smoke alarm on every storey used as living accommodation, and a carbon monoxide alarm in any room used as living accommodation that contains a fixed combustion appliance other than a gas cooker. Alarms must be confirmed in working order at the start of each tenancy, and faulty alarms repaired or replaced as soon as reasonably practicable. The duties arise under the Smoke and Carbon Monoxide Alarm (England) Regulations, as extended in 2022, and are enforced by local authorities.",
    keyPoints: [
      "Fit at least one smoke alarm on every storey of the property used as living accommodation.",
      "Fit a carbon monoxide alarm in any room used as living accommodation that contains a fixed combustion appliance (e.g. a boiler, wood burner or open fire) — gas cookers are excluded.",
      "Make sure every alarm is in working order at the start of each new tenancy (test on the first day).",
      "Repair or replace any alarm reported as faulty as soon as reasonably practicable.",
      "Enforced by local authorities, who can serve a remedial notice and impose a penalty of up to £5,000.",
    ],
    detailedInfo: `### Core duty
- **At least one smoke alarm on every storey** of the property that is used as living accommodation.
- A **carbon monoxide alarm in any room used as living accommodation that contains a fixed combustion appliance** (for example a boiler, wood burner or open fire) — **gas cookers are excluded**.

### Working order
- You must **make sure every alarm is in working order at the start of each new tenancy** (test on the first day of the tenancy).
- When a tenant reports a faulty alarm, you must **repair or replace it as soon as reasonably practicable**.
- The **2022 amendment** (in force 1 October 2022) extended the carbon monoxide requirement to fixed combustion appliances in all tenures and added the repair duty.

### Enforcement
- Local authorities can serve a remedial notice and impose a penalty of **up to £5,000**.

### Official guidance
- [Smoke and carbon monoxide alarms: explanatory booklet for landlords (gov.uk)](https://www.gov.uk/government/publications/smoke-and-carbon-monoxide-alarms-explanatory-booklet-for-landlords)`,
    timeline:
      "Verify all alarms work on the first day of each new tenancy; repair or replace faulty alarms as soon as reasonably practicable after a report.",
    defaultStatus: "compliant",
  },

  // -------------------------------------------------------------------------
  // Tenancy Setup
  // -------------------------------------------------------------------------
  {
    id: "tenancy-framework-rra",
    title: "Assured Periodic Tenancy Framework",
    category: "Tenancy Setup",
    legalReference:
      "Renters' Rights Act 2025 (amending the Housing Act 1988)",
    keyRequirement:
      "From 1 May 2026 all assured tenancies are periodic. Fixed terms and new assured shorthold tenancies (ASTs) are abolished — tenancies roll periodically and end only by tenant notice or a valid possession ground.",
    summary:
      "Since 1 May 2026 a private landlord can no longer grant an assured shorthold tenancy or a fixed term; new lettings are open-ended assured periodic tenancies that run month to month, and existing tenancies converted automatically. The tenant may end the tenancy at any time on at least two months' notice, while the landlord can end it only on a statutory ground for possession. The landlord must provide a written agreement and a written statement of the main terms before the tenancy begins.",
    keyPoints: [
      "Grant assured periodic tenancies only — fixed terms and new ASTs are abolished (Renters' Rights Act 2025, from 1 May 2026); remove fixed-term and break-clause drafting from templates.",
      "Provide a written tenancy agreement and give the tenant a written statement of the main terms before the tenancy is entered into.",
      "Existing tenancies converted automatically; landlords had to give existing tenants the government's official Information Sheet (or a written summary for verbal tenancies) by 31 May 2026.",
      "The tenant may end the tenancy at any time on at least two months' notice — there is no minimum fixed period a tenant must stay.",
      "Failing to provide the required tenancy information can attract a civil penalty of up to £7,000.",
    ],
    detailedInfo: `### The new single system
- The **Renters' Rights Act 2025** abolishes **assured shorthold tenancies (ASTs)** and **fixed terms**. From **1 May 2026** there is a single system of **assured periodic tenancies**.
- Tenancies **roll periodically** (rent periods of no more than a month). You **cannot lock a tenant into a fixed term**.
- Tenants can **end the tenancy at any time by giving at least 2 months' notice**.
- **Existing tenancies converted** to the new periodic system automatically on 1 May 2026.

### What you must do
- Use **periodic tenancy agreements** (no fixed end date) and provide a **written statement of the main terms** before the tenancy is entered into.
- For tenancies that already existed on 1 May 2026, give existing tenants the **official Information Sheet** (or, for verbal tenancies, a written summary of the main terms) — the deadline was **31 May 2026**.
- Remove fixed-term and break-clause drafting from your templates. Failing to provide the required information can attract a **civil penalty of up to £7,000**.

### Official guidance
- [Guide to the Renters' Rights Act (gov.uk)](https://www.gov.uk/guidance/renters-rights-act)
- [Renters' Rights Act 2025 (legislation.gov.uk)](https://www.legislation.gov.uk/ukpga/2025)`,
    timeline:
      "In force from 1 May 2026. Applies to all new tenancies and to existing tenancies on conversion. Tenant notice to quit: 2 months. Information Sheet to existing tenants by 31 May 2026.",
    defaultStatus: "action_required",
  },
  {
    id: "fees-deposits",
    title: "Permitted Fees, Deposit Caps & Protection",
    category: "Tenancy Setup",
    legalReference:
      "Tenant Fees Act 2019; Housing Act 2004 (tenancy deposit protection, sections 212–215); Renters' Rights Act 2025 (rent in advance)",
    keyRequirement:
      "Charge only permitted payments. The deposit is capped at 5 weeks' rent where annual rent is under £50,000, or 6 weeks' rent where it is £50,000 or more, and must be protected in a government-authorised scheme with the prescribed information served within 30 days.",
    summary:
      "The Tenant Fees Act 2019 limits what a landlord or agent may charge to a short list of permitted payments, caps the holding deposit at one week's rent, and caps the tenancy deposit at five or six weeks' rent depending on the annual rent. Any tenancy deposit taken must be protected in a government-approved scheme, and the prescribed information served, within 30 days of receipt. Failure exposes the landlord to a claim of one to three times the deposit and can prevent possession being recovered.",
    keyPoints: [
      "Take only permitted payments (rent, a capped tenancy deposit, a capped holding deposit, and limited default/variation/early-termination charges); a holding deposit is capped at one week's rent and must be refunded or applied within 7 days.",
      "Cap the tenancy deposit at 5 weeks' rent where annual rent is under £50,000, or 6 weeks' rent where it is £50,000 or more.",
      "Protect the deposit in a government-approved scheme (DPS, MyDeposits or TDS) and serve the prescribed information within 30 days of receipt.",
      "Since 1 May 2026, do not require more than one month's rent in advance, and do not set a rent period longer than a month.",
      "Late protection or missing prescribed information can mean a tenant claim of 1–3× the deposit and blocks possession; a first fee breach can bring a £5,000 penalty, and a repeat within five years is a criminal offence carrying up to £30,000.",
    ],
    detailedInfo: `### Banned and permitted fees
- The **Tenant Fees Act 2019** bans most letting fees. You may only take **permitted payments**: rent, a refundable tenancy deposit, a refundable holding deposit, and limited default/variation/early-termination charges (interest on late rent is capped at 3% above the Bank of England base rate; a change-of-tenancy fee is capped at £50 or reasonable cost).
- A **holding deposit is capped at 1 week's rent**, reserves the property for 15 days while checks are completed, and must be **refunded or applied within 7 days** if the tenancy proceeds.

### Deposit caps
- **5 weeks' rent** where the **annual rent is under £50,000**.
- **6 weeks' rent** where the **annual rent is £50,000 or more**.
- Weekly rent = monthly rent × 12 ÷ 52. Any amount above the cap is a prohibited payment.

### The 30-day protection rule
- Protect the deposit in a **government-authorised scheme** (Deposit Protection Service, MyDeposits, or Tenancy Deposit Scheme) and **serve the prescribed information within 30 days** of receipt.
- Failure exposes you to a tenant claim of **1–3× the deposit** and can invalidate possession action.

### Rent in advance (RRA 2025)
- Since **1 May 2026** you **may not require more than one month's rent in advance**, and a rent period may not be longer than a month.

### Penalties
- A first breach of the fees rules can bring a civil penalty of up to **£5,000**; a further breach within five years is a **criminal offence** carrying up to **£30,000**. Any prohibited payment taken must be repaid, and can block a possession claim.

### Official guidance
- [Tenant Fees Act 2019: guidance (gov.uk)](https://www.gov.uk/government/publications/tenant-fees-act-2019-guidance)
- [Tenancy deposit protection (gov.uk)](https://www.gov.uk/tenancy-deposit-protection)`,
    timeline:
      "Protect the deposit and serve the prescribed information within 30 days of receiving it. Deposit cap: 5 weeks (<£50k annual rent) or 6 weeks (≥£50k). Holding deposit: 1 week, refunded/applied within 7 days. Rent in advance: max one month.",
    defaultStatus: "compliant",
  },
  {
    id: "advertising-selection",
    title: "Advertising, Rental Bidding & Anti-Discrimination",
    category: "Tenancy Setup",
    legalReference:
      "Renters' Rights Act 2025; Equality Act 2010; Immigration Act 2014 (Right to Rent)",
    keyRequirement:
      "Publish an asking rent and do not invite or accept offers above it (rental bidding ban). Blanket bans on tenants who receive benefits ('No DSS') or who have children are unlawful, and Right to Rent checks must still be completed.",
    summary:
      "When advertising, the landlord or agent must state a proposed rent and may not invite or accept offers above it — the rental bidding ban introduced by the Renters' Rights Act 2025. It is unlawful to refuse a tenant, or treat them less favourably, because they have children or receive benefits, and the Equality Act 2010 prohibits discrimination on protected characteristics. Selection on genuine, evenly applied affordability and referencing grounds remains permitted, and Right to Rent checks must still be carried out.",
    keyPoints: [
      "State a proposed rent in the advertisement and do not invite, encourage or accept offers above the advertised figure (rental bidding ban) — set the asking rent realistically from the outset.",
      "Do not operate blanket 'no children' or 'no DSS' (no-benefits) policies, whether advertised or applied behind the scenes.",
      "Do not discriminate on Equality Act 2010 protected characteristics (race, sex, disability, religion, age, sexual orientation, pregnancy, and others).",
      "You may still decline a tenant for legitimate, consistently applied reasons such as affordability or references — keep clear, factual records of selection decisions.",
      "Carry out Right to Rent checks on every adult occupier before the tenancy begins; referencing and credit-check costs cannot be passed to the tenant or guarantor.",
    ],
    detailedInfo: `### Rental bidding ban
- You must **state a proposed rent** when advertising and **must not invite, encourage or accept offers above the advertised amount**. Rental bidding wars are prohibited under the **Renters' Rights Act 2025**. You remain free to set the asking rent at any level the market will bear, but cannot then play prospective tenants off against one another.

### Anti-discrimination in lettings
- It is **unlawful to discriminate against prospective tenants because they receive benefits** ("No DSS") or **because they have children**. Blanket policies and worded restrictions are caught.
- The **Equality Act 2010** also prohibits direct and indirect discrimination on protected characteristics.
- You may still assess **affordability and references fairly and consistently** — but the reason must be genuine and not a proxy for a prohibited ground.

### Right to Rent
- Before the tenancy begins you must **check that every adult occupier has the right to rent in the UK** (Immigration Act 2014), by verifying original documents or an approved online check, and keep copies. Repeat the check before a time-limited right expires. Apply it consistently to all applicants to avoid discrimination.

### Official guidance
- [Guide to the Renters' Rights Act (gov.uk)](https://www.gov.uk/guidance/renters-rights-act)
- [Renting and the Equality Act (gov.uk)](https://www.gov.uk/private-renting)`,
    timeline:
      "Applies to every advertisement and letting decision from 1 May 2026. Right to Rent checks before the tenancy begins; repeat before a time-limited right expires.",
    defaultStatus: "compliant",
  },

  // -------------------------------------------------------------------------
  // During Tenancy
  // -------------------------------------------------------------------------
  {
    id: "repairs-standards",
    title: "Repairs, Fitness & Awaab's Law",
    category: "During Tenancy",
    legalReference:
      "Landlord and Tenant Act 1985 (section 11); Homes (Fitness for Human Habitation) Act 2018; Renters' Rights Act 2025 (Decent Homes Standard and Awaab's Law extension to the PRS); Housing Health and Safety Rating System (HHSRS)",
    keyRequirement:
      "Keep the structure, exterior and key installations in repair, ensure the home is fit for human habitation throughout the tenancy, and respond to serious hazards such as damp and mould within the time limits set as Awaab's Law extends to the sector.",
    summary:
      "Under section 11 of the Landlord and Tenant Act 1985 the landlord must keep the structure, exterior and key installations in repair, and under the Homes (Fitness for Human Habitation) Act 2018 the property must be fit for human habitation throughout the tenancy. Local authorities assess hazards under the HHSRS, and the Renters' Rights Act extends a Decent Homes Standard and Awaab's Law to the sector, imposing binding time limits for serious hazards such as damp and mould. These obligations cannot be contracted out of.",
    keyPoints: [
      "Keep in repair the structure and exterior, and the installations for water, gas, electricity, sanitation, space heating and hot water (s.11 LTA 1985) — this cannot be contracted out of.",
      "Ensure the property is fit for human habitation at the start of and throughout the tenancy; tenants can take the landlord to court directly.",
      "Carry out repairs within a reasonable time of being notified of a defect, and keep evidence of the works done.",
      "Treat damp and mould as a landlord responsibility where they stem from a defect — investigate the cause promptly rather than attributing it to the tenant's lifestyle.",
      "As Awaab's Law extends to the sector, meet the binding timescales to investigate and remedy serious hazards; remove HHSRS Category 1 hazards.",
      "Give at least 24 hours' written notice before accessing the property and respect the tenant's right to quiet enjoyment.",
    ],
    detailedInfo: `### Repairing obligations (Section 11)
- Keep in repair the **structure and exterior** of the property, and the **installations for the supply of water, gas, electricity and sanitation, and for space and water heating**. This duty cannot be contracted out of, and repairs must be carried out within a reasonable time of being told of a defect.

### Fitness for human habitation
- Under the **Homes (Fitness for Human Habitation) Act 2018** the property must be **fit for human habitation at the start of and throughout the tenancy**. Tenants can take the landlord to court directly, without involving the local authority.

### Decent Homes Standard, Awaab's Law and the HHSRS
- Local authorities assess hazards using the **Housing Health and Safety Rating System (HHSRS)** and can require serious hazards to be remedied; **Category 1 hazards** must be removed.
- The **Renters' Rights Act 2025 extends a Decent Homes Standard** to the private rented sector (expected from around 2035) and **extends Awaab's Law**, imposing **binding time limits to investigate and remedy serious hazards** such as **damp and mould** (timing still to be confirmed).

### Damp, mould and condensation
- You **cannot simply attribute mould to a tenant's lifestyle and decline to act**. Where it stems from a defect such as poor ventilation, a leak or inadequate insulation, dealing with it is the landlord's responsibility. Investigate the cause promptly, address it, and keep a record of what was found and done.

### Access and quiet enjoyment
- The tenant has a right to **quiet enjoyment**. You must normally give **at least 24 hours' written notice** and call at a reasonable time before accessing the property; entering without permission or harassing a tenant can be a criminal offence under the Protection from Eviction Act 1977.

### Official guidance
- [Renting out a property: landlord responsibilities (gov.uk)](https://www.gov.uk/renting-out-a-property/landlord-responsibilities)
- [Guide to the Renters' Rights Act — Awaab's Law (gov.uk)](https://www.gov.uk/guidance/renters-rights-act)`,
    timeline:
      "Ongoing repairing duty; carry out repairs within a reasonable time of notification. Awaab's Law binding timescales for serious hazards as extended to the PRS (timing to be confirmed). 24 hours' written notice before access.",
    defaultStatus: "action_required",
  },
  {
    id: "rent-increases-pets",
    title: "Rent Increases (Section 13) & Pet Requests",
    category: "During Tenancy",
    legalReference:
      "Housing Act 1988 (section 13) as amended by the Renters' Rights Act 2025; Renters' Rights Act 2025 (pet provisions)",
    keyRequirement:
      "Increase rent only once every 12 months using a Section 13 notice giving at least 2 months' notice. A tenant's request to keep a pet cannot be unreasonably refused and must be answered within 28 days.",
    summary:
      "For an assured periodic tenancy the rent may be increased only once in any twelve-month period, and only by serving a section 13 notice giving at least two months' notice; rent-review clauses are no longer effective. A tenant may challenge a proposed increase at the First-tier Tribunal, which can determine the open-market rent. Since 1 May 2026 a tenant has the right to request to keep a pet, which the landlord must not unreasonably refuse and must answer within 28 days.",
    keyPoints: [
      "Increase rent at most once in any 12 months, and only via a section 13 notice (Form 4) giving at least two months' notice before the new rent takes effect.",
      "Rent-review and automatic-increase clauses are ineffective — the section 13 procedure is the only route.",
      "A tenant may challenge the increase at the First-tier Tribunal, which can determine the open-market rent (it cannot set the rent above the amount you proposed and cannot backdate it).",
      "Respond to a written pet request within 28 days and do not unreasonably refuse; give a valid, recorded reason for any refusal.",
      "You may make consent conditional on the tenant maintaining suitable pet insurance (or on you taking out cover and recovering the reasonable cost); a blanket 'no pets' policy is no longer safe.",
    ],
    detailedInfo: `### Rent increases — Section 13 only
- Rent-review clauses are no longer effective. The **only route to increase rent is a Section 13 notice (Form 4)**.
- You may increase rent **at most once every 12 months**, giving **at least 2 months' notice** before the new rent takes effect.
- A tenant can **challenge the increase at the First-tier Tribunal**, which can determine the open-market rent. The tribunal **cannot set the rent higher than you proposed (or above market rent)** and cannot backdate it.

### Pet requests
- Tenants have a **right to request to keep a pet**, and you **cannot unreasonably refuse**.
- You must **respond within 28 days** to a written request and **give a valid reason for any refusal**.
- You may **require the tenant to hold suitable pet insurance** (or take out such cover and recover its reasonable cost). A blanket "no pets" policy is no longer safe.

### Official guidance
- [Increasing the rent: Section 13 (gov.uk)](https://www.gov.uk/private-renting/rent-increases)
- [Guide to the Renters' Rights Act — pets (gov.uk)](https://www.gov.uk/guidance/renters-rights-act)`,
    timeline:
      "Rent: once per 12 months, minimum 2 months' notice (Form 4). Pets: respond within 28 days of a written request.",
    defaultStatus: "action_required",
  },

  // -------------------------------------------------------------------------
  // Possession
  // -------------------------------------------------------------------------
  {
    id: "ending-tenancy-possession",
    title: "Ending a Tenancy & Possession Grounds",
    category: "Possession",
    legalReference:
      "Renters' Rights Act 2025 (abolishing section 21 of the Housing Act 1988); Housing Act 1988 (section 8 grounds, as amended); Protection from Eviction Act 1977",
    keyRequirement:
      "Section 21 'no-fault' eviction is abolished. Possession requires a valid Section 8 ground and, in most cases, a court order. Moving in or selling (Grounds 1 and 1A) need 4 months' notice and cannot be used in the first 12 months of the tenancy.",
    summary:
      "The section 21 'no-fault' notice was abolished on 1 May 2026, so a landlord can recover possession only on a statutory section 8 ground and, in most cases, a court order. Possession to move in (Ground 1) or to sell (Ground 1A) requires four months' notice, cannot be used in the first twelve months of the tenancy, and is followed by re-letting restrictions; serious rent arrears (Ground 8) requires at least three months' arrears and four weeks' notice. A landlord must never resort to self-help.",
    keyPoints: [
      "Section 21 is abolished — recover possession only on a statutory section 8 ground, using the correct prescribed notice (Form 3) and then a court order if the tenant does not leave.",
      "Ground 1 (landlord/family moving in) and Ground 1A (selling): four months' notice, barred during the first 12 months (the protected period), with restrictions on re-letting or re-marketing afterwards.",
      "Serious rent arrears (Ground 8): a mandatory ground requiring at least three months' (or 13 weeks') arrears at both notice and hearing, with four weeks' notice.",
      "Be able to evidence the ground relied on — keep meticulous records throughout the tenancy; a procedural error (wrong form, invalid notice, an unprotected deposit) can defeat a claim.",
      "Never use self-help: changing locks, cutting off services or harassment is a criminal offence under the Protection from Eviction Act 1977 and can give rise to a rent repayment order; misusing the move-in/sell grounds is also an offence.",
    ],
    detailedInfo: `### No more Section 21
- The **Renters' Rights Act 2025 abolished Section 21 'no-fault' evictions** on 1 May 2026. You can only recover possession using a **Section 8 ground** and, in most cases, a **court order**.

### Section 8 grounds
- Grounds are **mandatory** (the court must grant possession if proven) or **discretionary** (the court decides if reasonable).
- **Ground 1 (landlord or close family moving in)** and **Ground 1A (selling the property)**:
  - require **4 months' notice**;
  - **cannot be used in the first 12 months** of the tenancy (the protected period); and
  - are followed by **restrictions on re-letting or re-marketing** the property if it is recovered to move in or sell.
- **Serious rent arrears (Ground 8)**: a mandatory ground where the tenant is at least **3 months' (or 13 weeks') in arrears** both when notice is served and at the hearing, with **4 weeks' notice**.
- Persistent late payment, breach of tenancy, anti-social behaviour and property damage are **discretionary grounds**, each with its own notice period.

### Process and lawful eviction
- Serve the correct **prescribed notice (Form 3)** stating the ground(s), then apply to the county court if the tenant does not leave; almost every claim now involves a hearing, so allow for a process measured in months.
- **Never take matters into your own hands.** Removing a tenant, changing the locks, cutting off services or harassment is a criminal offence under the **Protection from Eviction Act 1977**. Knowingly or recklessly misusing a possession ground is an offence and can give rise to a **rent repayment order**.

### Official guidance
- [Evicting tenants in England (gov.uk)](https://www.gov.uk/evicting-tenants)
- [Guide to the Renters' Rights Act — possession (gov.uk)](https://www.gov.uk/guidance/renters-rights-act)`,
    timeline:
      "Notice varies by ground: 4 months for move-in/sale (Grounds 1/1A, barred in the first 12 months, with a re-letting restriction afterwards); 4 weeks for serious rent arrears (Ground 8, at least 3 months' arrears).",
    defaultStatus: "action_required",
  },

  // -------------------------------------------------------------------------
  // Tax & Registration
  // -------------------------------------------------------------------------
  {
    id: "prs-database-ombudsman",
    title: "PRS Database & Landlord Ombudsman",
    category: "Tax & Registration",
    legalReference:
      "Renters' Rights Act 2025 (Private Rented Sector Database and PRS Landlord Ombudsman)",
    keyRequirement:
      "Register yourself and each let property on the new Private Rented Sector Database, and join the mandatory PRS Landlord Ombudsman scheme when each is required.",
    summary:
      "The Renters' Rights Act 2025 creates a national Private Rented Sector Database on which landlords must register themselves and their let properties, with roll-out beginning regionally from late 2026 and a mandatory annual fee. Once in force, a landlord will generally need to be correctly registered before obtaining most possession orders. The Act also establishes a compulsory Landlord Ombudsman, expected to become mandatory around 2028, giving tenants binding, independent redress without going to court.",
    keyPoints: [
      "Register as a landlord and register each let property on the Private Rented Sector Database when it rolls out in your region (from late 2026) — registration is mandatory and carries an annual fee.",
      "Keep key information up to date: contact details, property details and safety information such as gas, electrical and energy certificates.",
      "Once in force, correct registration is generally required before you can obtain most possession orders.",
      "Join the mandatory PRS Landlord Ombudsman scheme when required (expected around 2028) — membership is required even where a managing agent is used.",
      "Operating without required registration or Ombudsman membership can attract civil penalties up to £7,000, rising to £40,000 or criminal prosecution for serious or repeat breaches.",
    ],
    detailedInfo: `### Private Rented Sector (PRS) Database
- The **Renters' Rights Act 2025** creates a **mandatory national database of private landlords and their properties**. You must **register as a landlord and register each let property**, provide key information about yourself, the property and your compliance, and keep it up to date. Registration carries an **annual fee**.
- Roll-out begins **regionally from late 2026**, with a fuller launch following. Once in force you will **generally need to be correctly registered before you can obtain most possession orders** — so treat it as a core compliance task, not an administrative afterthought.

### PRS Landlord Ombudsman
- Membership of a **mandatory Landlord Ombudsman scheme** provides tenants with **binding, independent redress** for complaints without going to court. Membership is **required of all private landlords, including those who use a managing agent**.
- Expected to become mandatory **around 2028**, with notice given before landlords must join.

### Penalties
- Operating without required registration or Ombudsman membership can attract **civil penalties up to £7,000**, rising to **up to £40,000 or criminal prosecution** for serious or repeat breaches.

### Official guidance
- [Guide to the Renters' Rights Act — database and redress (gov.uk)](https://www.gov.uk/guidance/renters-rights-act)`,
    timeline:
      "PRS Database registration rolling out regionally from late 2026 (mandatory, annual fee); mandatory PRS Landlord Ombudsman membership expected around 2028.",
    defaultStatus: "upcoming_duty",
  },
  {
    id: "mtd-itsa",
    title: "Making Tax Digital for Income Tax & Section 24",
    category: "Tax & Registration",
    legalReference:
      "Making Tax Digital for Income Tax Self Assessment (MTD ITSA); Finance Act 2015 (section 24 finance cost restriction)",
    keyRequirement:
      "Keep digital records and file quarterly updates plus a final declaration once qualifying income crosses the MTD threshold — £50,000 from April 2026, £30,000 from April 2027, £20,000 from April 2028. Mortgage interest relief is restricted to a 20% basic-rate tax credit under Section 24.",
    summary:
      "Rental profit is subject to income tax, and reporting is moving to Making Tax Digital for Income Tax, which requires digital record-keeping, quarterly updates to HMRC and a final declaration. It is phased in by gross income from property and self-employment, before expenses: from April 2026 above £50,000, April 2027 above £30,000, and April 2028 above £20,000. Under the Section 24 restriction, individual landlords can no longer deduct finance costs and instead receive only a basic-rate (20%) tax reduction.",
    keyPoints: [
      "Once qualifying income crosses the threshold, keep digital records and submit four quarterly updates plus a final declaration each tax year using MTD-compatible software.",
      "Thresholds (gross income from property and self-employment, before expenses): £50,000+ from April 2026; £30,000+ from April 2027; £20,000+ from April 2028.",
      "Put compatible software in place before your start date; landlords who hold property through a company are outside MTD and pay corporation tax instead.",
      "Section 24: individual landlords can no longer deduct mortgage interest and other finance costs from rental income — relief is given only as a basic-rate (20%) tax reduction, which materially increases tax for higher- and additional-rate taxpayers.",
      "Keep full records of rent, every expense, certificates and capital expenditure; report rental income through Self Assessment until MTD applies.",
    ],
    detailedInfo: `### Making Tax Digital for Income Tax (MTD ITSA)
- If your **combined gross income from property and self-employment (before expenses)** exceeds the threshold, you must keep **digital records** and submit **four quarterly updates plus a final declaration** each tax year using **MTD-compatible software**.
- **Phased thresholds (qualifying income):**
  - **£50,000+ — from April 2026**;
  - **£30,000+ — from April 2027**;
  - **£20,000+ — from April 2028**.
- The **final declaration** replaces the Self Assessment return and confirms the year. **Landlords holding property through a company are outside this regime** and pay corporation tax instead. Make sure compatible software is in place before your start date.

### Section 24 — finance cost restriction
- Under **Section 24 of the Finance Act 2015**, individual landlords **can no longer deduct mortgage interest and other finance costs from rental income**. Instead you receive a **basic-rate (20%) tax reduction** on those costs.
- This particularly affects **higher- and additional-rate taxpayers**, who effectively get relief at only 20% rather than their marginal rate. The restriction does not apply to companies.

### Official guidance
- [Using Making Tax Digital for Income Tax (gov.uk)](https://www.gov.uk/guidance/using-making-tax-digital-for-income-tax)
- [Tax relief for residential landlords: how it's worked out (gov.uk)](https://www.gov.uk/guidance/changes-to-tax-relief-for-residential-landlords-how-its-worked-out-including-worked-examples)`,
    timeline:
      "MTD start dates by qualifying income: April 2026 (£50k+), April 2027 (£30k+), April 2028 (£20k+). Four quarterly updates + a final declaration each tax year.",
    defaultStatus: "action_required",
  },
];

// ---------------------------------------------------------------------------
// Convenience accessors
// ---------------------------------------------------------------------------

/** Look up a single regulation by id. */
export function getRegulationById(
  id: string,
): ComplianceRegulation | undefined {
  return complianceRegulations.find((r) => r.id === id);
}

/** All regulations in a category, in source order. */
export function getRegulationsByCategory(
  category: RegulationCategory,
): ComplianceRegulation[] {
  return complianceRegulations.filter((r) => r.category === category);
}

/** Regulations grouped by category, in REGULATION_CATEGORIES order. */
export function regulationsGroupedByCategory(): {
  category: RegulationCategory;
  regulations: ComplianceRegulation[];
}[] {
  return REGULATION_CATEGORIES.map((category) => ({
    category,
    regulations: getRegulationsByCategory(category),
  }));
}
