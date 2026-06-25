import type { Meta, StoryObj } from "@storybook/react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "./card";
import { Button } from "./button";
import { Badge } from "./badge";

const meta: Meta<typeof Card> = {
  title: "UI/Card",
  component: Card,
  parameters: { layout: "padded" },
};
export default meta;
type Story = StoryObj<typeof Card>;

export const Default: Story = {
  render: () => (
    <Card className="w-[380px]">
      <CardHeader>
        <CardTitle>12 Oakfield Road</CardTitle>
        <CardDescription>Bristol, BS6 5AB · Terraced</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center gap-2">
        <Badge tone="success">Active</Badge>
        <Badge tone="warning">EPC due soon</Badge>
      </CardContent>
      <CardFooter>
        <Button size="sm">View property</Button>
      </CardFooter>
    </Card>
  ),
};
