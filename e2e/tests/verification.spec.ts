import { test, expect, request } from "@playwright/test";
import path from "path";

const STRONG_PASSWORD = "TestPass123!";
// Resolve API base from env — never hardcode production URL.
const API_URL =
  process.env.PLAYWRIGHT_API_URL ??
  process.env.BAIRRONOW_API_URL ??
  "http://localhost:5000";
const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

test.describe("verification flow", () => {
  test("register -> CEP -> proof upload -> admin approve -> verified badge", async ({
    page,
  }) => {
    test.skip(
      !ADMIN_EMAIL || !ADMIN_PASSWORD,
      "E2E_ADMIN_EMAIL/E2E_ADMIN_PASSWORD required"
    );

    const timestamp = Date.now();
    const email = `e2e+v${timestamp}@bairronow.test`;
    let userAccessToken: string | undefined;

    // Register via API to avoid the email-confirmation success screen.
    const apiContext = await request.newContext({ baseURL: API_URL });
    const regRes = await apiContext.post("/api/v1/auth/register", {
      data: {
        email,
        password: STRONG_PASSWORD,
        confirmPassword: STRONG_PASSWORD,
        acceptedPrivacyPolicy: true,
      },
    });
    expect(regRes.ok()).toBeTruthy();

    // Capture user token immediately so we can clean up after the test
    const loginForCleanup = await apiContext.post("/api/v1/auth/login", {
      data: { email, password: STRONG_PASSWORD },
    });
    if (loginForCleanup.ok()) {
      const loginBody = await loginForCleanup.json();
      userAccessToken = loginBody.accessToken;
    }

    // Login in UI
    await page.goto("/login/");
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel(/^senha$/i).fill(STRONG_PASSWORD);
    await page.getByRole("button", { name: /entrar/i }).click();
    await page.waitForURL(/\/cep-lookup/, { timeout: 15_000 });

    // CEP lookup — two-step UI: fill CEP -> "Buscar endereco" (API lookup) ->
    // result card appears -> "Confirmar e continuar" (commits address, navigates on).
    await page.getByLabel("CEP", { exact: true }).fill("29101010");
    await page.getByRole("button", { name: /buscar endereco/i }).click();
    await page.getByRole("button", { name: /confirmar e continuar/i }).click();
    await page.waitForURL(/\/proof-upload/, { timeout: 15_000 });

    // Proof upload via hidden input (file picker workaround)
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(
      path.join(__dirname, "..", "fixtures", "proof.png")
    );
    await page.getByRole("button", { name: /enviar|submeter/i }).click();
    await page.waitForURL(/\/pending/, { timeout: 20_000 });

    // Admin login + approve via API
    const adminLogin = await apiContext.post("/api/v1/auth/login", {
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(adminLogin.ok()).toBeTruthy();
    const { accessToken: adminToken } = await adminLogin.json();

    const pendingRes = await apiContext.get(
      "/api/v1/admin/verifications?status=pending",
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    expect(pendingRes.ok()).toBeTruthy();
    const pendingBody = await pendingRes.json();
    const items = Array.isArray(pendingBody)
      ? pendingBody
      : pendingBody.items || [];
    const mine = items.find(
      (x: { userEmail: string }) => x.userEmail === email
    );
    expect(mine, "new verification should appear in admin queue").toBeTruthy();

    const approveRes = await apiContext.post(
      `/api/v1/admin/verifications/${mine.id}/approve`,
      {
        headers: {
          Authorization: `Bearer ${adminToken}`,
          "Content-Type": "application/json",
        },
        data: {},
      }
    );
    expect(approveRes.ok()).toBeTruthy();

    // Visit profile, expect verified badge
    await page.goto("/profile/");
    await expect(page.getByText(/vizinho verificado/i)).toBeVisible({
      timeout: 15_000,
    });

    // Now that the account is verified, confirm it can post with a photo
    // (PostComposer requires isVerified — this is the real end-to-end path
    // from registration to publishing content with an uploaded image).
    const postBody = `E2E foto ${timestamp}`;
    await page.goto("/feed/");
    await page.getByRole("button", { name: /novo post/i }).click();
    await page.getByPlaceholder(/o que está acontecendo/i).fill(postBody);
    await page
      .locator('input[type="file"]')
      .setInputFiles(path.join(__dirname, "..", "fixtures", "proof.png"));
    // Wait for client-side compression to finish and enable the submit button.
    await expect(page.getByRole("button", { name: /^publicar$/i })).toBeEnabled({
      timeout: 15_000,
    });
    await page.getByRole("button", { name: /^publicar$/i }).click();
    await expect(page.getByText(postBody)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByAltText(/imagem 1/i).first()).toBeVisible({
      timeout: 15_000,
    });

    // ---------------------------------------------------------------------------
    // Cleanup: delete the test user account
    // Uses DELETE /api/v1/account/me (self-delete) or admin endpoint as fallback.
    // Best-effort — test result is not affected if cleanup fails.
    // ---------------------------------------------------------------------------
    try {
      if (userAccessToken) {
        // Preferred: self-delete (no admin rights needed)
        const selfDelete = await apiContext.delete("/api/v1/account/me", {
          headers: { Authorization: `Bearer ${userAccessToken}` },
          data: { password: STRONG_PASSWORD },
        });
        if (!selfDelete.ok()) {
          // Fallback: admin hard-delete by email
          const { accessToken: adminToken } = await (
            await apiContext.post("/api/v1/auth/login", {
              data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
            })
          ).json();
          await apiContext.delete(`/api/v1/admin/users/by-email/${encodeURIComponent(email)}`, {
            headers: { Authorization: `Bearer ${adminToken}` },
          });
        }
      }
    } catch {
      console.warn(
        `[E2E] Could not delete test user ${email} — ` +
          "manual cleanup may be needed. Check DELETE /api/v1/account/me or " +
          "DELETE /api/v1/admin/users/by-email/:email"
      );
    } finally {
      await apiContext.dispose();
    }
  });
});
