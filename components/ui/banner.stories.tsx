import type { Meta, StoryObj } from "@storybook/react";
import { Info, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";
import { Banner } from "./banner";

const meta: Meta<typeof Banner> = {
  title: "UI/Banner",
  component: Banner,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof Banner>;

export const Tones: Story = {
  render: () => (
    <div className="w-[520px] space-y-3">
      <Banner tone="info" icon={<Info className="h-4 w-4" />}>
        Your bank feed has 3 new transactions to reconcile.
      </Banner>
      <Banner tone="success" icon={<CheckCircle2 className="h-4 w-4" />}>
        Quarterly MTD update submitted successfully.
      </Banner>
      <Banner tone="warning" icon={<AlertTriangle className="h-4 w-4" />}>
        Your free trial ends in 5 days.
      </Banner>
      <Banner tone="danger" icon={<ShieldAlert className="h-4 w-4" />} onDismiss={() => {}}>
        Rent is overdue on 12 Oakfield Road.
      </Banner>
    </div>
  ),
};
