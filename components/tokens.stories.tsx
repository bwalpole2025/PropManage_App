import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Design Tokens",
  parameters: { layout: "fullscreen" },
};
export default meta;
type Story = StoryObj;

function Swatch({ name, className }: { name: string; className: string }) {
  return (
    <div className="flex flex-col gap-2">
      <div className={`h-20 rounded-lg border border-border ${className}`} />
      <p className="text-xs font-medium">{name}</p>
    </div>
  );
}

export const Colours: Story = {
  render: () => (
    <div className="space-y-8 bg-background p-8">
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Brand
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="primary (forest green)" className="bg-primary" />
          <Swatch name="accent (teal/cyan)" className="bg-accent" />
          <Swatch name="primary/10 (active nav)" className="bg-primary/10" />
          <Swatch name="ring" className="bg-ring" />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Semantic
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="success (credit/done)" className="bg-success" />
          <Swatch name="warning (trial/warn)" className="bg-warning" />
          <Swatch name="danger (arrears)" className="bg-danger" />
          <Swatch name="muted" className="bg-muted" />
        </div>
      </div>
      <div>
        <h3 className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Neutrals
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Swatch name="background" className="bg-background" />
          <Swatch name="card" className="bg-card" />
          <Swatch name="border" className="bg-border" />
          <Swatch name="foreground" className="bg-foreground" />
        </div>
      </div>
    </div>
  ),
};

export const Typography: Story = {
  render: () => (
    <div className="space-y-4 bg-background p-8 font-sans">
      <p className="text-4xl font-bold tracking-tight">Page title — bold geometric</p>
      <p className="text-lg font-medium">Card heading — medium</p>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Uppercase grey metric label
      </p>
      <p className="text-2xl font-semibold tabular-nums">£4,710.00</p>
      <p className="text-sm text-muted-foreground">
        Body text in Poppins, the brand geometric sans.
      </p>
    </div>
  ),
};

export const Glassmorphism: Story = {
  parameters: { backgrounds: { default: "forest" } },
  render: () => (
    <div
      className="flex min-h-[300px] items-center justify-center p-10"
      style={{ background: "hsl(152 47% 26%)" }}
    >
      <div className="glass max-w-xs rounded-2xl p-8 text-white">
        <p className="text-xs font-medium uppercase tracking-wide text-white/70">
          Glass surface
        </p>
        <p className="mt-2 text-lg font-semibold">Pricing card aesthetic</p>
        <p className="mt-1 text-sm text-white/80">
          Translucent, blurred, soft border + shadow.
        </p>
      </div>
    </div>
  ),
};
