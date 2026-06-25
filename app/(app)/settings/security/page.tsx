import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { SecurityForm } from "./security-form";

export default async function SecuritySettingsPage() {
  const ctx = await getActiveContext();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    select: { emailVerified: true, twoFactorEnabled: true, passwordHash: true },
  });

  return (
    <SecurityForm
      emailVerified={!!user.emailVerified}
      twoFactorEnabled={user.twoFactorEnabled}
      hasPassword={!!user.passwordHash}
    />
  );
}
