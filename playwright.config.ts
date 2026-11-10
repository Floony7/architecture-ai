import { loadEnvConfig } from "@next/env";
import { defineConfig, devices } from "@playwright/test";

loadEnvConfig(process.cwd());

const port = 3100;
const baseURL = `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  use: { baseURL },
  webServer: {
    command: `pnpm build && pnpm start --hostname localhost --port ${port}`,
    port,
    timeout: 120_000,
  },
  projects: [
    { name: "clerk-setup", testMatch: "clerk.setup.ts" },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
      dependencies: ["clerk-setup"],
    },
  ],
});
