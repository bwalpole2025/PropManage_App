import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MapPin } from "lucide-react";
import { getActiveContext } from "@/lib/auth/active-org";
import { prisma } from "@/lib/db";
import { PropertyTabs } from "@/components/properties/property-tabs";
import { Badge } from "@/components/ui/badge";
import { PropertyTypeLabel } from "@/lib/enums";

export default async function PropertyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ propertyId: string }>;
}) {
  const { propertyId } = await params;
  const { entityId } = await getActiveContext();
  const property = await prisma.property.findFirst({
    where: { id: propertyId, landlordEntityId: entityId },
  });
  if (!property) notFound();

  return (
    <div className="space-y-5">
      <Link
        href="/properties"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All properties
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {property.addressLine1}
          </h1>
          <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            {[property.addressLine2, property.city, property.postcode]
              .filter(Boolean)
              .join(", ")}
          </p>
        </div>
        <Badge tone="primary">
          {PropertyTypeLabel[
            property.propertyType as keyof typeof PropertyTypeLabel
          ] ?? property.propertyType}
        </Badge>
      </div>

      <PropertyTabs propertyId={propertyId} />

      <div>{children}</div>
    </div>
  );
}
