import { defineConfig, devices } from "@playwright/test";

/**
 * BairroNow Playwright config.
 *
 * Base URL resolution order (first defined wins):
 *   1. PLAYWRIGHT_BASE_URL  — explicit override (recommended for CI/staging)
 *   2. BAIRRONOW_WEB_URL   — legacy env var kept for backwards compat
 *   3. http://localhost:3000 — local dev default
 *
 * The config will WARN loudly when CI runs would hit production, and will
 * THROW when NODE_ENV=production without an explicit PLAYWRIGHT_BASE_URL.
 */

const baseURL =
  process.env.PLAYWRIGHT_BASE_URL ??
  process.env.BAIRRONOW_WEB_URL ??
  "http://localhost:3000";

const apiURL =
  process.env.PLAYWRIGHT_API_URL ??
  process.env.BAIRRONOW_API_URL ??
  "http://localhost:5000";

const isProduction = baseURL.includes("bairronow.com.br");

// Hard error: never run E2E against production when NODE_ENV=production
// (e.g. an accidental `NODE_ENV=production pnpm test:e2e` on a CI runner).
if (process.env.NODE_ENV === "production" && !process.env.PLAYWRIGHT_BASE_URL) {
  throw new Error(
    "[E2E] Refusing to run: NODE_ENV=production but PLAYWRIGHT_BASE_URL is not set. " +
      "Set PLAYWRIGHT_BASE_URL to a staging URL or use the e2e-smoke.yml workflow for intentional production runs."
  );
}

// Warn when CI targets production without the explicit override.
// This covers the scheduled smoke workflow that sets PLAYWRIGHT_BASE_URL explicitly.
if (process.env.CI && isProduction && !process.env.PLAYWRIGHT_BASE_URL) {
  console.warn(
    "[E2E] WARNING: Tests are targeting PRODUCTION (bairronow.com.br) but " +
      "PLAYWRIGHT_BASE_URL was not explicitly set. " +
      "Set PLAYWRIGHT_BASE_URL=https://bairronow.com.br in the workflow env to silence this " +
      "warning and confirm the intent."
  );
}

// Expose resolved URLs so individual spec files can import them from config
// instead of hardcoding https://api.bairronow.com.br.
export { apiURL };

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 1,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL,
    // Traces/screenshots capture full request/response bodies — including the
    // admin login POST (email+password in clear text) and the resulting JWT.
    // e2e-smoke.yml uploads e2e/test-results/ as a public, unauthenticated
    // GitHub Actions artifact (repo is public): a retained trace on a failed
    // run against production is a leaked admin credential. Never capture
    // either against production, regardless of pass/fail.
    trace: isProduction ? "off" : "retain-on-failure",
    screenshot: isProduction ? "off" : "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
