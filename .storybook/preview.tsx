import * as React from "react";
import type { Preview } from "@storybook/react";
import "../app/globals.css";

// Storybook does not run next/font; Poppins is loaded via preview-head.html and
// --font-sans falls back to it below. The decorator applies the app's base
// surface (Poppins + foreground colour) around every story.
const preview: Preview = {
  parameters: {
    layout: "centered",
    backgrounds: {
      default: "app",
      values: [
        { name: "app", value: "hsl(210 40% 98%)" },
        { name: "card", value: "#ffffff" },
        { name: "forest", value: "hsl(152 47% 26%)" },
      ],
    },
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
  },
  decorators: [
    (Story) => (
      <div
        className="font-sans text-foreground"
        style={
          { "--font-sans": "Poppins, ui-sans-serif, system-ui, sans-serif" } as React.CSSProperties
        }
      >
        <Story />
      </div>
    ),
  ],
};

export default preview;
