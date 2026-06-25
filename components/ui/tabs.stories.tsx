import type { Meta, StoryObj } from "@storybook/react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "./tabs";

const meta: Meta<typeof Tabs> = {
  title: "UI/Tabs",
  component: Tabs,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof Tabs>;

export const Underline: Story = {
  render: () => (
    <Tabs defaultValue="overview" className="w-[480px]">
      <TabsList>
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="tenancies">Tenancies</TabsTrigger>
        <TabsTrigger value="compliance">Compliance</TabsTrigger>
      </TabsList>
      <TabsContent value="overview">Property overview content.</TabsContent>
      <TabsContent value="tenancies">Tenancies content.</TabsContent>
      <TabsContent value="compliance">Compliance documents.</TabsContent>
    </Tabs>
  ),
};

export const Pill: Story = {
  render: () => (
    <Tabs defaultValue="monthly" variant="pill" className="w-[320px]">
      <TabsList>
        <TabsTrigger value="monthly">Monthly</TabsTrigger>
        <TabsTrigger value="annual">Annual</TabsTrigger>
      </TabsList>
      <TabsContent value="monthly">Billed monthly.</TabsContent>
      <TabsContent value="annual">Billed annually (save 20%).</TabsContent>
    </Tabs>
  ),
};
