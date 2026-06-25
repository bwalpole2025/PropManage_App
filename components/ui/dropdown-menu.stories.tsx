import type { Meta, StoryObj } from "@storybook/react";
import { ChevronsUpDown, LogOut, User as UserIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownTrigger,
  DropdownContent,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "./dropdown-menu";

const meta: Meta<typeof DropdownMenu> = {
  title: "UI/DropdownMenu",
  component: DropdownMenu,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof DropdownMenu>;

export const Default: Story = {
  render: () => (
    <DropdownMenu>
      <DropdownTrigger className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm hover:bg-muted">
        Account <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </DropdownTrigger>
      <DropdownContent>
        <DropdownLabel>Signed in</DropdownLabel>
        <DropdownItem>
          <UserIcon className="h-4 w-4" /> Profile
        </DropdownItem>
        <DropdownSeparator />
        <DropdownItem className="text-danger">
          <LogOut className="h-4 w-4" /> Sign out
        </DropdownItem>
      </DropdownContent>
    </DropdownMenu>
  ),
};
