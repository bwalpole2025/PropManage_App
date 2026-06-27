import { PageHeader } from "@/components/shared/page-header";
import { LandlordInfoTab } from "@/components/compliance/LandlordInfoTab";

export const metadata = {
  title: "Landlord information",
};

export default function LandlordInfoPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Landlord information"
        description="A searchable library of the regulations that apply to letting in England — current to June 2026."
      />
      <LandlordInfoTab />
    </div>
  );
}
