import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { ...devices["iPhone 13"] } },
  ],
  testMatch: "**/*.spec.ts",
  workers: process.env.CI ? 2 : undefined,
  use: {
    baseURL: "http://127.0.0.1:3100",
    actionTimeout: 10000,
    navigationTimeout: 20000,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node tests/fixtures/auth-server.mjs",
      url: "http://127.0.0.1:54329/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run start -- --hostname 127.0.0.1 --port 3100",
      url: "http://127.0.0.1:3100",
      reuseExistingServer: false,
      env: {
        SUPABASE_SECRET_KEY: "chave-secreta-de-teste",
        NEXT_PUBLIC_SITE_URL: "http://127.0.0.1:3100",
        NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54329",
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_teste",
      },
    },
  ],
});
