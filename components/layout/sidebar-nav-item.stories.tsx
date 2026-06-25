import type { Meta, StoryObj } from "@storybook/react";
import { LayoutDashboard, Building2, Calculator } from "lucide-react";
import { SidebarNavItem } from "./sidebar-nav-item";

const meta: Meta<typeof SidebarNavItem> = {
  title: "Layout/SidebarNavItem",
  component: SidebarNavItem,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof SidebarNavItem>;

export const Nav: Story = {
  render: () => (
    <div className="w-56 rounded-lg border border-border bg-card p-3">
      <nav className="flex flex-col gap-1">
        <SidebarNavItem href="#" label="Dashboard" icon={LayoutDashboard} active />
        <SidebarNavItem href="#" label="My Properties" icon={Building2} />
        <SidebarNavItem href="#" label="Tax" icon={Calculator} />
      </nav>
    </div>
  ),
};
