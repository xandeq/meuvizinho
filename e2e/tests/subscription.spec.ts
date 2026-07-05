import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-test-2026@bairronow-ci.com";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Teste@2026!";
const API_BASE =
  process.env.PLAYWRIGHT_API_URL ??
  process.env.BAIRRONOW_API_URL ??
  "http://localhost:5000";

test.describe.configure({ mode: "serial" });

let apiToken: string;

test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const loginRes = await ctx.post("/api/v1/auth/login", {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (!loginRes.ok()) {
    await ctx.dispose();
    throw new Error(`E2E login failed: ${loginRes.status()}`);
  }
  apiToken = (await loginRes.json()).accessToken;
  await ctx.dispose();
});

test("GET /subscription/status retorna forma do contrato", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const res = await ctx.get("/api/v1/subscription/status", {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(["free", "premium"]).toContain(body.plan);
  expect(typeof body.isEligibleForTrial).toBe("boolean");
  expect(typeof body.isOnTrial).toBe("boolean");
  await ctx.dispose();
});

// Idempotente: trial é 1x por conta — se elegível ativa e valida; se já usado,
// valida que a API recusa com 409 (comportamento correto pós-primeiro-run).
test("trial: ativa quando elegível, 409 quando já usado", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const headers = { Authorization: `Bearer ${apiToken}` };

  const statusRes = await ctx.get("/api/v1/subscription/status", { headers });
  const status = await statusRes.json();

  const trialRes = await ctx.post("/api/v1/subscription/trial", { headers });
  if (status.isEligibleForTrial && status.plan === "free") {
    expect(trialRes.ok()).toBeTruthy();
    const after = await (await ctx.get("/api/v1/subscription/status", { headers })).json();
    expect(after.plan).toBe("premium");
    expect(after.isOnTrial).toBe(true);
    expect(after.daysRemaining).toBeGreaterThan(0);
  } else {
    expect(trialRes.status()).toBe(409);
  }
  await ctx.dispose();
});

test("webhook kiwify: assinatura inválida retorna 401 (fail-closed)", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const res = await ctx.post("/api/v1/webhooks/kiwify?signature=deadbeef", {
    data: { webhook_event_type: "order_approved", Customer: { email: TEST_EMAIL } },
  });
  // 401 = token configurado e assinatura rejeitada; 503 = token ainda não configurado.
  expect([401, 503]).toContain(res.status());
  await ctx.dispose();
});

test("página /premium exibe status do plano e benefícios", async ({ page }) => {
  // Injeta o token no storage de auth antes de navegar
  await page.goto("/login/");
  await page.fill('input[type="email"]', TEST_EMAIL);
  await page.fill('input[type="password"]', TEST_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/feed|cep-lookup|premium/, { timeout: 15000 });

  await page.goto("/premium/");
  await expect(page.getByText("Meu Vizinho Premium")).toBeVisible();
  await expect(page.getByText("O que está incluso")).toBeVisible();
  // Um dos estados de plano deve estar visível
  await expect(
    page.getByText(/plano gratuito|Premium ativo/i).first()
  ).toBeVisible({ timeout: 10000 });
});
