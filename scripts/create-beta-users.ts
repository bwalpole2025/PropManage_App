// Create (or reset) the closed-beta tester accounts.
//
// Public sign-up is disabled during the beta (see actions/auth.ts), so beta
// testers can't self-register — this script provisions their accounts directly.
// It mirrors what registerAction would have done: a User (OWNER), an owning
// Account with a default portfolio, and an ACTIVE OWNER membership. Emails are
// marked verified so testers skip the verification step.
//
// Run it against the target database (its DATABASE_URL):
//   npx tsx scripts/create-beta-users.ts
// It is idempotent — re-running resets the password for an existing email.
//
// IMPORTANT: edit BETA_USERS to your testers' real emails, then set the same
// addresses in BETA_TESTER_EMAILS (the login allowlist). The two must match.

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import {
  LandlordType,
  MembershipRole,
  MembershipStatus,
  UserRole,
} from "@/lib/enums";

interface BetaUser {
  name: string;
  email: string;
  password: string;
  /** The display name of their portfolio/organisation. */
  entityName: string;
  entityType: (typeof LandlordType)[keyof typeof LandlordType];
}

// --- Edit these four ↓ (use the testers' real emails) ----------------------
const BETA_USERS: BetaUser[] = [
  {
    name: "Beta Tester One",
    email: "tester1@example.com",
    password: "Cedar-Harbor-4827",
    entityName: "Tester One Lettings",
    entityType: LandlordType.INDIVIDUAL,
  },
  {
    name: "Beta Tester Two",
    email: "tester2@example.com",
    password: "Quartz-Willow-3915",
    entityName: "Tester Two Lettings",
    entityType: LandlordType.INDIVIDUAL,
  },
  {
    name: "Beta Tester Three",
    email: "tester3@example.com",
    password: "Marble-Lantern-7204",
    entityName: "Tester Three Lettings",
    entityType: LandlordType.INDIVIDUAL,
  },
  {
    name: "Beta Tester Four",
    email: "tester4@example.com",
    password: "Compass-Otter-6538",
    entityName: "Tester Four Lettings",
    entityType: LandlordType.INDIVIDUAL,
  },
];
// ---------------------------------------------------------------------------

async function main() {
  for (const u of BETA_USERS) {
    const email = u.email.trim().toLowerCase();
    const passwordHash = await bcrypt.hash(u.password, 10);
    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      await prisma.user.update({
        where: { email },
        data: { passwordHash, emailVerified: existing.emailVerified ?? new Date() },
      });
      console.log(`↻ reset password for existing account: ${email}`);
      continue;
    }

    const [firstName, ...rest] = u.name.trim().split(/\s+/);
    const user = await prisma.user.create({
      data: {
        firstName,
        lastName: rest.join(" ") || null,
        email,
        passwordHash,
        emailVerified: new Date(),
        role: UserRole.OWNER,
        ownedEntities: {
          create: {
            displayName: u.entityName,
            type: u.entityType,
            portfolios: {
              create: {
                name: "Personal — Default",
                type: "personal",
                isDefault: true,
              },
            },
          },
        },
      },
      include: { ownedEntities: true },
    });
    const entity = user.ownedEntities[0];
    await prisma.membership.create({
      data: {
        userId: user.id,
        accountId: entity.id,
        role: MembershipRole.OWNER,
        status: MembershipStatus.ACTIVE,
        acceptedAt: new Date(),
      },
    });
    console.log(`✓ created account: ${email}`);
  }

  console.log("\nSet this in your production environment (the login allowlist):");
  console.log(
    `BETA_TESTER_EMAILS="${BETA_USERS.map((u) => u.email.trim().toLowerCase()).join(",")}"`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
