import { test, expect } from "@playwright/test";

const STRONG_PASSWORD = "TestPass123!";
// Resolve API base from env — never hardcode production URL.
const API_BASE =
  process.env.PLAYWRIGHT_API_URL ??
  process.env.BAIRRONOW_API_URL ??
  "http://localhost:5000";

test.describe("auth flow", () => {
  test("register -> redirect to cep-lookup, then login -> redirect", async ({
    page,
    playwright,
  }) => {
    const timestamp = Date.now();
    const email = `e2e+${timestamp}@bairronow.test`;
    let accessToken: string | undefined;

    // Register
    await page.goto("/register/");
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/^senha$/i).fill(STRONG_PASSWORD);
    await page.getByLabel(/confirmar senha/i).fill(STRONG_PASSWORD);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: /criar conta/i }).click();

    // Register currently shows a success message (email verification).
    await expect(page.getByText(/verifique seu e-?mail/i)).toBeVisible({
      timeout: 15_000,
    });

    // Login
    await page.goto("/login/");
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/^senha$/i).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();

    // Should leave /login — a new unverified user lands on /cep-lookup.
    await page.waitForURL((url) => !url.pathname.startsWith("/login"), {
      timeout: 15_000,
    });
    expect(page.url()).toMatch(/\/cep-lookup|\/feed/);

    // Try to get token via API login so we can clean up the test account
    try {
      const ctx = await playwright.request.newContext({ baseURL: API_BASE });
      const loginRes = await ctx.post("/api/v1/auth/login", {
        data: { email, password: STRONG_PASSWORD },
      });
      if (loginRes.ok()) {
        const body = await loginRes.json();
        accessToken = body.accessToken;
      }
      // Attempt self-delete using password confirmation
      if (accessToken) {
        await ctx.delete("/api/v1/account/me", {
          headers: { Authorization: `Bearer ${accessToken}` },
          data: { password: STRONG_PASSWORD },
        });
        // Best-effort — failure leaves the test user in DB but doesn't fail the test.
      }
      await ctx.dispose();
    } catch {
      console.warn(
        `[E2E] Could not delete test user ${email} — ` +
          "manual cleanup may be needed or DELETE /api/v1/account/me is not implemented yet"
      );
    }
  });
});
