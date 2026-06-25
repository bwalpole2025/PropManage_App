import type { Meta, StoryObj } from "@storybook/react";
import { Coachmark } from "./coachmark";
import { Button } from "@/components/ui/button";
import { useCoachmark } from "@/lib/hooks/use-coachmark";

const meta: Meta<typeof Coachmark> = {
  title: "Shared/Coachmark",
  component: Coachmark,
  parameters: { layout: "centered" },
};
export default meta;
type Story = StoryObj<typeof Coachmark>;

// Uses a unique key + a reset button so the story can be re-triggered.
export const FirstVisit: Story = {
  render: () => {
    const Demo = () => {
      const { reset } = useCoachmark("sb-demo");
      return (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Shown once per browser. Use reset to see it again.
          </p>
          <Button variant="outline" onClick={reset}>
            Reset coachmark
          </Button>
          <Coachmark storageKey="sb-demo" title="Welcome to Transactions">
            Categorise each transaction to an SA105 box to power your tax estimate.
            You can change a category any time.
          </Coachmark>
        </div>
      );
    };
    return <Demo />;
  },
};
