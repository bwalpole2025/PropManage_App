import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { prisma } from "@/lib/db";
import { taxYearOptions } from "@/lib/format";
import { OrganizationForm } from "../organization-form";

export default async function OrganizationSettingsPage() {
  const ctx = await getActiveContext();
  const entity = await prisma.account.findUniqueOrThrow({
    where: { id: ctx.entityId },
  });

  const timeZones = Intl.supportedValuesOf("timeZone");
  const taxYears = taxYearOptions(2026, 2014);

  return (
    <OrganizationForm
      org={{
        displayName: entity.displayName,
        type: entity.type,
        utr: entity.utr,
        companyNumber: entity.companyNumber,
        mtdEnrolled: entity.mtdEnrolled,
        timeZone: entity.timeZone,
        firstTaxYear: entity.firstTaxYear,
      }}
      timeZones={timeZones}
      taxYears={taxYears}
      canEdit={can(ctx.role, Capability.MANAGE_BILLING)}
    />
  );
}
