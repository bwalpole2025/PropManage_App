import { PageHeader } from "@/components/shared/page-header";
import { ComplianceDashboard } from "@/components/compliance/ComplianceDashboard";

export const metadata = {
  title: "Compliance guide",
};

export default function ComplianceGuidePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance guide"
        description="The landlord regulations that apply to your portfolio — current to June 2026, including the Renters' Rights Act 2025 and Making Tax Digital."
      />
      <ComplianceDashboard />
    </div>
  );
}
