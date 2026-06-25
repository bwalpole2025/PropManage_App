import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { can, Capability } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/shared/page-header";
import { Forbidden } from "@/components/shared/forbidden";
import { AddPropertyForm } from "@/components/properties/add-property-form";
import { Card, CardContent } from "@/components/ui/card";

export default async function NewPropertyPage() {
  const ctx = await getActiveContext();
  if (!can(ctx.role, Capability.MANAGE_PROPERTIES)) {
    return (
      <Forbidden
        backHref="/properties"
        message="Only owners and managers can add properties."
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/properties"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to properties
      </Link>
      <PageHeader
        title="Add a property"
        description="Step 1 of replacing the spreadsheet."
      />
      <Card>
        <CardContent className="pt-5">
          {/* React Hook Form + Zod → tRPC properties.create mutation */}
          <AddPropertyForm />
        </CardContent>
      </Card>
    </div>
  );
}
