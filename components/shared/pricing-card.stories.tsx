import type { Meta, StoryObj } from "@storybook/react";
import { PricingCard } from "./pricing-card";

const meta: Meta<typeof PricingCard> = {
  title: "Shared/PricingCard",
  component: PricingCard,
  parameters: { layout: "fullscreen", backgrounds: { default: "forest" } },
};
export default meta;
type Story = StoryObj<typeof PricingCard>;

export const Trio: Story = {
  render: () => (
    <div
      className="grid gap-6 p-10 md:grid-cols-3"
      style={{ background: "linear-gradient(hsl(152 47% 26%), hsl(152 42% 18%))" }}
    >
      <PricingCard
        name="Free"
        priceLabel="Free"
        period="forever"
        description="For getting started"
        features={["1 property", "Manual transactions", "Compliance reminders"]}
        cta="Get started"
        ctaHref="#"
      />
      <PricingCard
        name="Starter"
        priceLabel="£4.50"
        period="per month"
        description="For growing landlords"
        features={["Up to 8 properties", "Bank feed", "SA105 estimates"]}
        cta="Choose Starter"
        ctaHref="#"
      />
      <PricingCard
        name="Pro"
        priceLabel="£8.50"
        period="per month"
        description="For portfolios"
        featured
        badge="Most popular"
        features={["Up to 45 properties", "MTD submissions", "Accountant access"]}
        cta="Choose Pro"
        ctaHref="#"
      />
    </div>
  ),
};
