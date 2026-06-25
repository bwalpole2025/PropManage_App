// Seed a believable demo dataset:
//  - an individual landlord (principal) + a limited-company entity they own
//  - an accountant with delegated ACCOUNTANT access to the individual entity
//  - properties, tenancies, owners/splits
//  - ~14 months of categorised transactions (SA105) for tax + dashboard
//  - a rent schedule with one overdue period -> arrears / missing-rent alert
//  - compliance documents near/after expiry -> reminder tiers
//
// Login after seeding:
//   landlord@example.com   / Password123!   (Owner of two entities)
//   accountant@example.com / Password123!   (delegated Accountant on entity A)

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { Sa105Category } from "../lib/sa105";
import {
  ComplianceType,
  DepositScheme,
  LandlordType,
  MembershipRole,
  MembershipStatus,
  PropertyType,
  RentFrequency,
  RentStatus,
  TenancyStatus,
  TxnDirection,
  TxnSource,
  TxnStatus,
  UserRole,
} from "../lib/enums";

const prisma = new PrismaClient();

const PASSWORD = "Password123!";

function daysFromNow(days: number): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

/** First-of-month dates for the last `n` months (oldest first), day fixed. */
function monthlyDates(n: number, day: number): Date[] {
  const out: Date[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    out.push(new Date(now.getFullYear(), now.getMonth() - i, day, 12));
  }
  return out;
}

async function reset() {
  // Order matters for FK constraints; delete children first.
  await prisma.$transaction([
    prisma.mtdSubmission.deleteMany(),
    prisma.mtdObligation.deleteMany(),
    prisma.mtdConnection.deleteMany(),
    prisma.taxYearEstimate.deleteMany(),
    prisma.complianceReminder.deleteMany(),
    prisma.complianceDocument.deleteMany(),
    prisma.importantDate.deleteMany(),
    prisma.arrearsAlert.deleteMany(),
    prisma.rentScheduleEntry.deleteMany(),
    prisma.bankTransaction.deleteMany(),
    prisma.bankAccount.deleteMany(),
    prisma.bankConnection.deleteMany(),
    prisma.transaction.deleteMany(),
    prisma.fileObject.deleteMany(),
    prisma.tenant.deleteMany(),
    prisma.tenancy.deleteMany(),
    prisma.propertyOwnership.deleteMany(),
    prisma.property.deleteMany(),
    prisma.beneficialOwner.deleteMany(),
    prisma.portfolio.deleteMany(),
    prisma.company.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.membership.deleteMany(),
    prisma.account.deleteMany(),
    prisma.session.deleteMany(),
    prisma.authAccount.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main() {
  await reset();
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  // --- Users ---
  const landlord = await prisma.user.create({
    data: {
      firstName: "Jordan",
      lastName: "Hayes",
      email: "landlord@example.com",
      passwordHash,
      role: UserRole.OWNER,
      mobile: "+447700900123",
      mobileVerified: true,
      numberOfPropertiesManaged: 2,
      emailVerified: new Date(),
    },
  });

  const accountant = await prisma.user.create({
    data: {
      firstName: "Priya",
      lastName: "Accountant",
      email: "accountant@example.com",
      passwordHash,
      role: UserRole.ACCOUNTANT,
      emailVerified: new Date(),
    },
  });

  // --- Entity A: individual landlord (rich data) ---
  const entityA = await prisma.account.create({
    data: {
      displayName: "Hayes Property Portfolio",
      type: LandlordType.INDIVIDUAL,
      utr: "1234567890",
      mtdEnrolled: true,
      subscriptionStatus: "active",
      firstTaxYear: "2024-25",
      timeZone: "Europe/London",
      principalUserId: landlord.id,
      memberships: {
        create: [
          {
            userId: landlord.id,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
            acceptedAt: new Date(),
          },
          {
            userId: accountant.id,
            role: MembershipRole.ACCOUNTANT,
            status: MembershipStatus.ACTIVE,
            invitedByUserId: landlord.id,
            inviteEmail: accountant.email,
            acceptedAt: new Date(),
          },
        ],
      },
    },
  });

  // --- Entity B: limited company (lighter data, shows switcher + company tax) ---
  const entityB = await prisma.account.create({
    data: {
      displayName: "Hayes Lettings Ltd",
      type: LandlordType.LIMITED_COMPANY,
      companyName: "Hayes Lettings Ltd",
      companyNumber: "09876543",
      utr: "9876543210",
      principalUserId: landlord.id,
      memberships: {
        create: [
          {
            userId: landlord.id,
            role: MembershipRole.OWNER,
            status: MembershipStatus.ACTIVE,
            acceptedAt: new Date(),
          },
        ],
      },
    },
  });

  // --- Portfolios: one default 'Personal — Default' per account ---
  const defaultPortfolioA = await prisma.portfolio.create({
    data: {
      accountId: entityA.id,
      name: "Personal — Default",
      type: "personal",
      isDefault: true,
    },
  });

  // Entity B (limited company) gets a default personal portfolio + a business
  // portfolio backed by a Company.
  await prisma.portfolio.create({
    data: {
      accountId: entityB.id,
      name: "Personal — Default",
      type: "personal",
      isDefault: true,
    },
  });
  const companyB = await prisma.company.create({
    data: {
      accountId: entityB.id,
      name: "Hayes Lettings Ltd",
      companyNumber: "09876543",
      utr: "9876543210",
      vatRegistered: false,
    },
  });
  const businessPortfolioB = await prisma.portfolio.create({
    data: {
      accountId: entityB.id,
      name: "Hayes Lettings Ltd",
      type: "business",
      companyId: companyB.id,
    },
  });

  // --- Beneficial owners for entity A: Jordan 70% + partner 30% ---
  const ownerJordan = await prisma.beneficialOwner.create({
    data: {
      accountId: entityA.id,
      type: "individual",
      userId: landlord.id,
      legalName: "Jordan Hayes",
    },
  });
  const ownerSam = await prisma.beneficialOwner.create({
    data: {
      accountId: entityA.id,
      type: "individual",
      legalName: "Sam Hayes",
    },
  });

  // --- Properties for entity A ---
  const prop1 = await prisma.property.create({
    data: {
      accountId: entityA.id,
      portfolioId: defaultPortfolioA.id,
      addressLine1: "12 Oakfield Road",
      city: "Bristol",
      postcode: "BS6 5AB",
      propertyType: PropertyType.TERRACED,
      bedrooms: 3,
      purchaseDate: new Date(2019, 5, 1),
      purchasePricePence: 28_500_000,
      currentValuePence: 34_000_000,
      furnished: false,
      ownerships: {
        create: [
          { beneficialOwnerId: ownerJordan.id, ownershipPercentageBp: 7000 },
          { beneficialOwnerId: ownerSam.id, ownershipPercentageBp: 3000 },
        ],
      },
    },
  });

  const prop2 = await prisma.property.create({
    data: {
      accountId: entityA.id,
      portfolioId: defaultPortfolioA.id,
      addressLine1: "Flat 4, 88 Wellington Court",
      city: "Bristol",
      postcode: "BS1 4TY",
      propertyType: PropertyType.FLAT,
      bedrooms: 2,
      purchaseDate: new Date(2021, 8, 15),
      purchasePricePence: 21_000_000,
      currentValuePence: 23_500_000,
      furnished: true,
      ownerships: {
        create: [
          { beneficialOwnerId: ownerJordan.id, ownershipPercentageBp: 10000 },
        ],
      },
    },
  });

  // --- Property for entity B (in the business portfolio) ---
  const prop3 = await prisma.property.create({
    data: {
      accountId: entityB.id,
      portfolioId: businessPortfolioB.id,
      addressLine1: "27 Castle Street",
      city: "Bath",
      postcode: "BA1 2SH",
      propertyType: PropertyType.SEMI_DETACHED,
      bedrooms: 4,
      purchaseDate: new Date(2022, 2, 10),
      purchasePricePence: 41_000_000,
      currentValuePence: 44_000_000,
      furnished: false,
    },
  });

  // --- Tenancies ---
  const tenancy1 = await prisma.tenancy.create({
    data: {
      propertyId: prop1.id,
      status: TenancyStatus.ACTIVE,
      startDate: new Date(2023, 0, 6),
      rentPence: 125_000, // £1,250/mo
      rentFrequency: RentFrequency.MONTHLY,
      rentDueDay: 3,
      depositPence: 144_200,
      depositScheme: DepositScheme.DPS,
      depositRef: "DPS-99213",
      tenants: {
        create: [
          { name: "James Smith", email: "james.smith@example.com", isLeadTenant: true },
          { name: "Aisha Khan", email: "aisha.khan@example.com" },
        ],
      },
    },
  });

  const tenancy2 = await prisma.tenancy.create({
    data: {
      propertyId: prop2.id,
      status: TenancyStatus.ACTIVE,
      startDate: new Date(2024, 5, 1),
      rentPence: 98_000,
      rentFrequency: RentFrequency.MONTHLY,
      rentDueDay: 1,
      depositPence: 113_000,
      depositScheme: DepositScheme.TDS,
      tenants: {
        create: [{ name: "Maria Garcia", email: "maria.g@example.com", isLeadTenant: true }],
      },
    },
  });

  const tenancy3 = await prisma.tenancy.create({
    data: {
      propertyId: prop3.id,
      status: TenancyStatus.ACTIVE,
      startDate: new Date(2023, 9, 1),
      rentPence: 175_000,
      rentFrequency: RentFrequency.MONTHLY,
      rentDueDay: 1,
      depositPence: 201_900,
      depositScheme: DepositScheme.MYDEPOSITS,
      tenants: {
        create: [{ name: "Tom Wilson", email: "tom.w@example.com", isLeadTenant: true }],
      },
    },
  });

  // --- Transactions: ~14 months, categorised to SA105 ---
  type TxnSeed = {
    entityId: string;
    propertyId: string;
    tenancyId?: string;
    direction: string;
    amountPence: number;
    date: Date;
    description: string;
    category: string;
    merchant?: string;
  };
  const txns: TxnSeed[] = [];

  const incomeStreams = [
    { entityId: entityA.id, prop: prop1, tenancy: tenancy1, rent: 125_000, day: 3 },
    { entityId: entityA.id, prop: prop2, tenancy: tenancy2, rent: 98_000, day: 1 },
    { entityId: entityB.id, prop: prop3, tenancy: tenancy3, rent: 175_000, day: 1 },
  ];

  for (const s of incomeStreams) {
    // Rent income for the last 14 months (skip the most recent for prop1 -> arrears).
    const dates = monthlyDates(14, s.day);
    dates.forEach((d, idx) => {
      const isLatest = idx === dates.length - 1;
      if (s.prop.id === prop1.id && isLatest) return; // unpaid -> arrears
      txns.push({
        entityId: s.entityId,
        propertyId: s.prop.id,
        tenancyId: s.tenancy.id,
        direction: TxnDirection.INCOME,
        amountPence: s.rent,
        date: d,
        description: "Monthly rent received",
        category: Sa105Category.RENT_INCOME,
        merchant: "Tenant standing order",
      });
    });

    // Monthly letting-agent fee (10% of rent) + monthly mortgage interest.
    monthlyDates(14, 5).forEach((d) => {
      txns.push({
        entityId: s.entityId,
        propertyId: s.prop.id,
        direction: TxnDirection.EXPENSE,
        amountPence: Math.round(s.rent * 0.1),
        date: d,
        description: "Letting agent management fee",
        category: Sa105Category.LETTING_AGENT_FEES,
        merchant: "City Lettings",
      });
      txns.push({
        entityId: s.entityId,
        propertyId: s.prop.id,
        direction: TxnDirection.EXPENSE,
        amountPence: Math.round(s.rent * 0.45),
        date: d,
        description: "Buy-to-let mortgage interest",
        category: Sa105Category.MORTGAGE_INTEREST,
        merchant: "Barclays BTL",
      });
    });
  }

  // A few one-off expenses on entity A.
  txns.push(
    {
      entityId: entityA.id,
      propertyId: prop1.id,
      direction: TxnDirection.EXPENSE,
      amountPence: 8_900,
      date: daysFromNow(-40),
      description: "Annual landlord insurance",
      category: Sa105Category.INSURANCE,
      merchant: "DirectLine for Business",
    },
    {
      entityId: entityA.id,
      propertyId: prop1.id,
      direction: TxnDirection.EXPENSE,
      amountPence: 24_500,
      date: daysFromNow(-22),
      description: "Boiler repair — replace expansion vessel",
      category: Sa105Category.REPAIRS_MAINTENANCE,
      merchant: "AquaHeat Plumbing",
    },
    {
      entityId: entityA.id,
      propertyId: prop2.id,
      direction: TxnDirection.EXPENSE,
      amountPence: 14_000,
      date: daysFromNow(-12),
      description: "Communal service charge",
      category: Sa105Category.SERVICE_CHARGE,
      merchant: "Wellington Court Management",
    },
    {
      entityId: entityA.id,
      propertyId: prop1.id,
      direction: TxnDirection.EXPENSE,
      amountPence: 35_000,
      date: daysFromNow(-8),
      description: "Accountancy fees",
      category: Sa105Category.ACCOUNTANCY_LEGAL,
      merchant: "Priya & Co",
    },
  );

  // Mark recent transactions UNRECONCILED so Transactions screen has work to do.
  await prisma.transaction.createMany({
    data: txns.map((t) => ({
      accountId: t.entityId,
      propertyId: t.propertyId,
      tenancyId: t.tenancyId,
      direction: t.direction,
      amountPence: t.amountPence,
      date: t.date,
      description: t.description,
      merchant: t.merchant,
      category: t.category,
      source: TxnSource.BANK_FEED,
      status:
        t.date.getTime() > daysFromNow(-20).getTime()
          ? TxnStatus.UNRECONCILED
          : TxnStatus.RECONCILED,
    })),
  });

  // --- Rent schedule for tenancy1 (entity A) -> arrears on latest period ---
  const scheduleDates = monthlyDates(12, 3);
  for (let i = 0; i < scheduleDates.length; i++) {
    const dueDate = scheduleDates[i];
    const isLatest = i === scheduleDates.length - 1;
    const isPenultimate = i === scheduleDates.length - 2;
    const entry = await prisma.rentScheduleEntry.create({
      data: {
        tenancyId: tenancy1.id,
        dueDate,
        expectedPence: 125_000,
        receivedPence: isLatest ? 0 : isPenultimate ? 60_000 : 125_000,
        status: isLatest
          ? RentStatus.OVERDUE
          : isPenultimate
            ? RentStatus.PARTIAL
            : RentStatus.PAID,
      },
    });
    if (isLatest || isPenultimate) {
      const shortfall = 125_000 - entry.receivedPence;
      await prisma.arrearsAlert.create({
        data: {
          tenancyId: tenancy1.id,
          rentScheduleEntryId: entry.id,
          shortfallPence: shortfall,
          daysOverdue: Math.max(0, Math.round((Date.now() - dueDate.getTime()) / 86400000)),
        },
      });
    }
  }

  // --- Compliance documents (varied expiry to show reminder tiers) ---
  const compliance: Array<{
    propertyId: string;
    type: string;
    expiry: Date;
    issued?: Date;
    reference?: string;
  }> = [
    { propertyId: prop1.id, type: ComplianceType.GAS_SAFETY, expiry: daysFromNow(6), reference: "CP12-2024-1187" },
    { propertyId: prop1.id, type: ComplianceType.EPC, expiry: daysFromNow(25), reference: "EPC-0042-3318-7290" },
    { propertyId: prop1.id, type: ComplianceType.EICR, expiry: daysFromNow(380) },
    { propertyId: prop2.id, type: ComplianceType.GAS_SAFETY, expiry: daysFromNow(-3), reference: "CP12-2023-0091" },
    { propertyId: prop2.id, type: ComplianceType.EPC, expiry: daysFromNow(120) },
    { propertyId: prop3.id, type: ComplianceType.GAS_SAFETY, expiry: daysFromNow(70) },
  ];
  const entityForProp: Record<string, string> = {
    [prop1.id]: entityA.id,
    [prop2.id]: entityA.id,
    [prop3.id]: entityB.id,
  };
  for (const c of compliance) {
    const offsets = [30, 14, 7, 1];
    await prisma.complianceDocument.create({
      data: {
        accountId: entityForProp[c.propertyId],
        propertyId: c.propertyId,
        type: c.type,
        issuedDate: c.issued ?? daysFromNow(-330),
        expiryDate: c.expiry,
        reference: c.reference,
        reminderOffsetsDays: offsets,
        reminders: {
          create: offsets.map((o) => ({
            offsetDays: o,
            fireOn: new Date(c.expiry.getTime() - o * 86400000),
          })),
        },
      },
    });
  }

  // --- Important dates ---
  await prisma.importantDate.createMany({
    data: [
      {
        accountId: entityA.id,
        propertyId: prop1.id,
        title: "Tenancy renewal — 12 Oakfield Road",
        date: daysFromNow(48),
        kind: "TENANCY_RENEWAL",
      },
      {
        accountId: entityA.id,
        propertyId: prop2.id,
        title: "Mortgage fixed rate ends",
        date: daysFromNow(95),
        kind: "MORTGAGE_FIX_END",
      },
    ],
  });

  // --- MTD connection + obligations for entity A (mock, enrolled) ---
  const mtd = await prisma.mtdConnection.create({
    data: {
      accountId: entityA.id,
      status: "CONNECTED",
      businessIncomeSourceId: "XBIS00000123456",
      expiresAt: daysFromNow(30),
    },
  });
  // Two illustrative quarterly obligations.
  await prisma.mtdObligation.createMany({
    data: [
      {
        mtdConnectionId: mtd.id,
        periodKey: "Q1",
        startDate: daysFromNow(-110),
        endDate: daysFromNow(-20),
        dueDate: daysFromNow(10),
        type: "QUARTERLY_UPDATE",
        status: "OPEN",
      },
      {
        mtdConnectionId: mtd.id,
        periodKey: "Q2",
        startDate: daysFromNow(-20),
        endDate: daysFromNow(70),
        dueDate: daysFromNow(100),
        type: "QUARTERLY_UPDATE",
        status: "OPEN",
      },
    ],
  });

  console.log("\n✅ Seed complete.");
  console.log("   Landlord:   landlord@example.com   /", PASSWORD);
  console.log("   Accountant: accountant@example.com /", PASSWORD);
  console.log(
    `   Entities: ${entityA.displayName} (A, 2 properties) + ${entityB.displayName} (B, 1 property)`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
