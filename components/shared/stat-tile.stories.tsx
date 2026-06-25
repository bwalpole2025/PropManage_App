import type { Meta, StoryObj } from "@storybook/react";
import { TrendingUp } from "lucide-react";
import { MetricCard } from "./stat-tile";

const meta: Meta<typeof MetricCard> = {
  title: "Shared/MetricCard",
  component: MetricCard,
  parameters: { layout: "padded" },
  args: {
    label: "Rental income",
    value: "£4,710",
    hint: "This tax year to date",
    accent: "success",
  },
};
export default meta;
type Story = StoryObj<typeof MetricCard>;

export const Default: Story = {
  args: { icon: <TrendingUp className="h-4 w-4" /> },
};

export const Grid: Story = {
  render: () => (
    <div className="grid w-[640px] grid-cols-2 gap-4 lg:grid-cols-4">
      <MetricCard label="Rental income" value="£4,710" accent="success" />
      <MetricCard label="Expenses" value="£1,320" accent="neutral" />
      <MetricCard label="Net position" value="£3,390" accent="primary" />
      <MetricCard label="Rent arrears" value="£190" accent="danger" />
    </div>
  ),
};
