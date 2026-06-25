import type { StorybookConfig } from "@storybook/react-vite";
import { mergeConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";
import path from "node:path";

// Vite builder (not @storybook/nextjs/webpack) — avoids the Next-15 compiled
// webpack incompatibility. next/link & next/navigation are aliased to light
// stubs so presentational components that use them render in isolation.
const stub = (p: string) => path.resolve(process.cwd(), ".storybook", p);

const config: StorybookConfig = {
  framework: { name: "@storybook/react-vite", options: {} },
  stories: ["../components/**/*.stories.@(ts|tsx)"],
  addons: ["@storybook/addon-essentials", "@storybook/addon-a11y"],
  staticDirs: ["../public"],
  core: { disableTelemetry: true },
  docs: { autodocs: "tag" },
  async viteFinal(cfg) {
    return mergeConfig(cfg, {
      plugins: [tsconfigPaths()],
      resolve: {
        alias: {
          "next/link": stub("./next-stubs/link.tsx"),
          "next/navigation": stub("./next-stubs/navigation.ts"),
        },
      },
    });
  },
};

export default config;
