import { PageHeader } from "@/components/shared/page-header";
import { SettingsTabs } from "@/components/settings/settings-tabs";

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Manage your profile, organisation and delegated access."
      />
      <SettingsTabs />
      <div className="max-w-3xl">{children}</div>
    </div>
  );
}
