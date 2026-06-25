import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { SearchInput } from "./search-input";

const meta: Meta<typeof SearchInput> = {
  title: "UI/SearchInput",
  component: SearchInput,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof SearchInput>;

export const Default: Story = {
  render: () => {
    const Demo = () => {
      const [value, setValue] = useState("");
      return (
        <div className="w-[320px]">
          <SearchInput
            placeholder="Search transactions…"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onClear={() => setValue("")}
          />
        </div>
      );
    };
    return <Demo />;
  },
};
