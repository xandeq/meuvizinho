import { test, expect, request } from "@playwright/test";

/**
 * Full-site smoke crawl: visits every real route (public + authenticated),
 * fails on HTTP errors, uncaught exceptions, or console errors.
 * This is the fast, broad complement to the deeper flow specs (auth,
 * verification, community) — it exists to catch regressions on screens
 * that don't have a dedicated flow test yet.
 */

const API_URL =
  process.env.PLAYWRIGHT_API_URL ??
  process.env.BAIRRONOW_API_URL ??
  "http://localhost:5000";

const PUBLIC_ROUTES = [
  "/",
  "/login/",
  "/register/",
  "/forgot-password/",
  "/privacy-policy/",
  // /premium/ excluded — only exists on unmerged feat/kiwify-webhook branch.
  "/auth/magic-link/",
];

// Routes that require an authenticated session but not verification.
const AUTHED_ROUTES = [
  "/feed/",
  "/marketplace/",
  "/map/",
  "/condominios/",
  "/whatsapp/",
  "/groups/",
  "/events/",
  "/alertas/",
  "/notifications/",
  "/chat/",
  "/profile/",
  "/businesses/",
];

const IGNORABLE_CONSOLE_PATTERNS = [
  /favicon/i,
  /manifest/i,
  /Failed to load resource.*404/i, // handled per-route below when expected
];

function attachConsoleCollector(page: import("@playwright/test").Page) {
  const errors: string[] = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  return errors;
}

test.describe("smoke crawl — public routes", () => {
  for (const route of PUBLIC_ROUTES) {
    test(`GET ${route} loads without console errors`, async ({ page }) => {
      const errors = attachConsoleCollector(page);
      // "load" (not "networkidle") — authed pages keep a SignalR hub
      // connection open (NotificationBell), which never lets the network
      // go idle and would make every authed route time out here.
      const res = await page.goto(route, { waitUntil: "load" });
      await page.waitForTimeout(1000);
      expect(res?.status(), `${route} HTTP status`).toBeLessThan(400);
      const meaningful = errors.filter(
        (e) => !IGNORABLE_CONSOLE_PATTERNS.some((p) => p.test(e))
      );
      expect(meaningful, `console errors on ${route}`).toEqual([]);
    });
  }
});

test.describe("smoke crawl — authenticated routes", () => {
  const STRONG_PASSWORD = "TestPass123!";
  let email: string;
  let accessToken: string | undefined;

  test.beforeAll(async () => {
    const timestamp = Date.now();
    email = `e2e+crawl${timestamp}@bairronow.test`;
    const ctx = await request.newContext({ baseURL: API_URL });
    const reg = await ctx.post("/api/v1/auth/register", {
      data: {
        email,
        password: STRONG_PASSWORD,
        confirmPassword: STRONG_PASSWORD,
        acceptedPrivacyPolicy: true,
      },
    });
    expect(reg.ok()).toBeTruthy();
    const login = await ctx.post("/api/v1/auth/login", {
      data: { email, password: STRONG_PASSWORD },
    });
    expect(login.ok()).toBeTruthy();
    const body = await login.json();
    accessToken = body.accessToken;
    await ctx.dispose();
  });

  test.afterAll(async () => {
    if (!accessToken) return;
    const ctx = await request.newContext({ baseURL: API_URL });
    try {
      await ctx.delete("/api/v1/account/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
        data: { password: STRONG_PASSWORD },
      });
    } catch {
      console.warn(`[E2E] Could not delete crawl test user ${email}`);
    } finally {
      await ctx.dispose();
    }
  });

  test.beforeEach(async ({ page }) => {
    await page.goto("/login/");
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/^senha$/i).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
  });

  for (const route of AUTHED_ROUTES) {
    test(`GET ${route} loads without console errors (authed)`, async ({
      page,
    }) => {
      const errors = attachConsoleCollector(page);
      // "load" (not "networkidle") — authed pages keep a SignalR hub
      // connection open (NotificationBell), which never lets the network
      // go idle and would make every authed route time out here.
      const res = await page.goto(route, { waitUntil: "load" });
      await page.waitForTimeout(1000);
      expect(res?.status(), `${route} HTTP status`).toBeLessThan(400);
      const meaningful = errors.filter(
        (e) => !IGNORABLE_CONSOLE_PATTERNS.some((p) => p.test(e))
      );
      expect(meaningful, `console errors on ${route}`).toEqual([]);
    });
  }
});
