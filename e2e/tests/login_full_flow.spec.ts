import { test, expect } from "@playwright/test";

test.describe("login full flow — production validation", () => {
  const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-test-2026@bairronow-ci.com";
  const TEST_PASSWORD =
    process.env.E2E_TEST_PASSWORD ??
    (() => {
      throw new Error(
        "E2E_TEST_PASSWORD env var is required — no hardcoded fallback (this account exists in production)."
      );
    })();

  test("successful login redirects away from /login/", async ({ page }) => {
    const apiCalls: { url: string; status: number }[] = [];
    page.on("response", (resp) => {
      if (resp.url().includes("/api/")) {
        apiCalls.push({ url: resp.url(), status: resp.status() });
      }
    });

    await page.goto("/login/");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/e-?mail/i).fill(TEST_EMAIL);
    await page.getByLabel(/^senha$/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();

    // Login call should return 200
    await page.waitForResponse((r) =>
      r.url().includes("/auth/login") && r.status() === 200
    , { timeout: 10000 });

    // Should redirect away from login
    await page.waitForFunction(() =>
      !window.location.pathname.startsWith("/login"), { timeout: 8000 }
    );

    const finalUrl = page.url();
    console.log("Redirected to:", finalUrl);
    expect(finalUrl).not.toContain("/login/");

    // Login call was 200, no refresh calls
    const loginCall = apiCalls.find((c) => c.url.includes("/auth/login"));
    expect(loginCall?.status).toBe(200);
    const refreshCalls = apiCalls.filter((c) => c.url.includes("/auth/refresh"));
    expect(refreshCalls.length).toBe(0);
  });

  test("wrong credentials show real API error (not generic)", async ({ page }) => {
    await page.goto("/login/");
    await page.waitForLoadState("networkidle");

    await page.getByLabel(/e-?mail/i).fill("naoexiste@naoexiste.com");
    await page.getByLabel(/^senha$/i).fill("senhaerrada123");
    await page.getByRole("button", { name: /entrar/i }).click();

    const errorAlert = page.locator('[role="alert"]:has(p)');
    await expect(errorAlert).toBeVisible({ timeout: 8000 });
    const text = await errorAlert.locator("p").innerText();
    console.log("Error shown:", text);

    // Must NOT be the generic fallback
    expect(text).not.toBe("Erro ao fazer login. Tente novamente.");
    // Must be the real API message
    expect(text.length).toBeGreaterThan(5);
  });
});
