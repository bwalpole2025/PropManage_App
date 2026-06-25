import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { ProfileForm } from "./profile-form";

export default async function ProfileSettingsPage() {
  const ctx = await getActiveContext();
  const user = await prisma.user.findUniqueOrThrow({
    where: { id: ctx.user.id },
    select: {
      firstName: true,
      lastName: true,
      email: true,
      emailVerified: true,
      mobile: true,
      mobileVerified: true,
      numberOfPropertiesManaged: true,
    },
  });

  return (
    <ProfileForm
      user={{
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        emailVerified: !!user.emailVerified,
        mobile: user.mobile,
        mobileVerified: user.mobileVerified,
        numberOfPropertiesManaged: user.numberOfPropertiesManaged,
      }}
    />
  );
}
