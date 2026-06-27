import { BadgeCheck } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { getComplianceFormData } from "@/services/compliance/lists";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  RegistrationForm,
  PrsdRow,
  RightToRentRow,
} from "@/components/compliance/registration-forms";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  const ctx = await getActiveContext();
  const form = await getComplianceFormData(ctx.entityId);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Registrations"
        description="Renters' Rights Act 2025 registrations: PRS Landlord Ombudsman, the Private Rented Sector Database, and tenants' Right to Rent."
      />

      {/* PRS Landlord Ombudsman (account-level) */}
      <Card>
        <CardHeader>
          <CardTitle>PRS Landlord Ombudsman</CardTitle>
          <CardDescription>
            Membership is mandatory for private landlords under the RRA 2025.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm registration={form.registration} />
        </CardContent>
      </Card>

      {/* Private Rented Sector Database (per property) */}
      <Card>
        <CardHeader>
          <CardTitle>Private Rented Sector Database</CardTitle>
          <CardDescription>Each let property must be registered on the PRSD.</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {form.propertiesPrsd.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck className="h-5 w-5" />}
              title="No properties"
              description="Add a property to record its PRSD registration."
            />
          ) : (
            <div>
              {form.propertiesPrsd.map((p) => (
                <PrsdRow key={p.id} property={p} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Right to Rent (per tenant) */}
      <Card>
        <CardHeader>
          <CardTitle>Right to Rent</CardTitle>
          <CardDescription>
            Record time-limited visa expiry dates so we can remind you to re-check.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          {form.tenants.length === 0 ? (
            <EmptyState
              icon={<BadgeCheck className="h-5 w-5" />}
              title="No active tenants"
              description="Add an active tenancy to record Right to Rent checks."
            />
          ) : (
            <div>
              {form.tenants.map((t) => (
                <RightToRentRow key={t.id} tenant={t} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
