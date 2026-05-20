import { test, expect, APIRequestContext } from "@playwright/test";

const TEST_EMAIL = "e2e-test-2026@bairronow-ci.com";
const TEST_PASSWORD = "Teste@2026!";
const API_BASE = "https://api.bairronow.com.br";

// Serial — each test builds on state from the previous one
test.describe.configure({ mode: "serial" });

let apiToken: string;
let bairroId: number;
let groupId: number;
let pollId: number;

// ---------------------------------------------------------------------------
// Setup: login via API and create an isolated test group
// ---------------------------------------------------------------------------
test.beforeAll(async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });

  const loginRes = await ctx.post("/api/v1/auth/login", {
    data: { email: TEST_EMAIL, password: TEST_PASSWORD },
  });
  if (!loginRes.ok()) {
    await ctx.dispose();
    throw new Error(`E2E login failed: ${loginRes.status()}`);
  }
  const { accessToken, user } = await loginRes.json();
  apiToken = accessToken;
  bairroId = user?.bairroId ?? 1; // fallback to bairroId=1 for unverified E2E user

  const groupRes = await ctx.post("/api/v1/groups", {
    headers: { Authorization: `Bearer ${apiToken}` },
    data: {
      bairroId,
      name: `E2E Polls ${Date.now()}`,
      description: "Grupo temporário criado por E2E — pode ser deletado",
      category: "Outros",
      joinPolicy: "Open",
      scope: "Bairro",
    },
  });
  if (!groupRes.ok()) {
    await ctx.dispose();
    throw new Error(`Could not create E2E group: ${groupRes.status()}`);
  }
  const group = await groupRes.json();
  groupId = group.id;

  await ctx.dispose();
});

// ---------------------------------------------------------------------------
// Teardown: clean up the test group
// ---------------------------------------------------------------------------
test.afterAll(async ({ playwright }) => {
  if (!groupId || !apiToken) return;
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  await ctx.delete(`/api/v1/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  await ctx.dispose();
});

// ---------------------------------------------------------------------------
// Helper: login in the browser using UI
// ---------------------------------------------------------------------------
async function browserLogin(page: ReturnType<typeof test.info>["project"]["use"] extends infer U ? never : import("@playwright/test").Page) {
  await page.goto("/login/");
  await page.waitForLoadState("domcontentloaded");
  await page.getByLabel(/e-?mail/i).fill(TEST_EMAIL);
  await page.getByLabel(/^senha$/i).fill(TEST_PASSWORD);
  await page.getByRole("button", { name: /entrar/i }).click();
  await page.waitForFunction(
    () => !window.location.pathname.startsWith("/login"),
    { timeout: 12_000 }
  );
}

// ---------------------------------------------------------------------------
// Test 1 — polls tab renders (empty state or list)
// ---------------------------------------------------------------------------
test("polls tab is reachable for group owner", async ({ page }) => {
  await browserLogin(page);
  await page.goto(`/groups/${groupId}/`);
  await page.waitForLoadState("domcontentloaded");

  // Click the Enquetes tab
  await page.getByRole("button", { name: /enquetes/i }).click();

  // Either empty state or poll list must appear
  const emptyState = page.getByText(/nenhuma enquete/i);
  const createBtn = page.getByRole("button", { name: /criar enquete/i });
  await expect(createBtn.or(emptyState)).toBeVisible({ timeout: 8_000 });
});

// ---------------------------------------------------------------------------
// Test 2 — create a poll
// ---------------------------------------------------------------------------
test("create a poll — UI submit returns new poll card", async ({ page }) => {
  await browserLogin(page);
  await page.goto(`/groups/${groupId}/`);
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: /enquetes/i }).click();

  // Open creation form
  await page.getByRole("button", { name: /criar enquete/i }).click();
  await expect(page.getByPlaceholder(/qual horário/i)).toBeVisible({ timeout: 5_000 });

  const question = `Qual opção você prefere? (E2E ${Date.now()})`;
  await page.getByPlaceholder(/qual horário/i).fill(question);

  const optionInputs = page.getByPlaceholder(/opção \d+/i);
  await optionInputs.nth(0).fill("Sim");
  await optionInputs.nth(1).fill("Não");

  // Capture the API response to extract poll id
  const createResponse = page.waitForResponse(
    (r) => r.url().includes(`/groups/${groupId}/polls`) && r.request().method() === "POST",
    { timeout: 10_000 }
  );

  await page.getByRole("button", { name: /publicar enquete/i }).click();

  const resp = await createResponse;
  expect(resp.status()).toBe(201);
  const poll = await resp.json();
  pollId = poll.id;

  // Poll card must appear with the question text
  await expect(page.getByText(question)).toBeVisible({ timeout: 8_000 });
  // Options visible
  await expect(page.getByText("Sim")).toBeVisible();
  await expect(page.getByText("Não")).toBeVisible();
  // Badge shows "Aberta"
  await expect(page.getByText("Aberta")).toBeVisible();
});

// ---------------------------------------------------------------------------
// Test 3 — vote on a poll option
// ---------------------------------------------------------------------------
test("voting on a poll option updates percentages", async ({ page }) => {
  if (!pollId) test.skip(true, "Depends on poll created in test 2");

  await browserLogin(page);
  await page.goto(`/groups/${groupId}/`);
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: /enquetes/i }).click();

  // Wait for the poll card to appear
  const pollCard = page.locator(".bg-card").filter({ hasText: "Sim" }).first();
  await expect(pollCard).toBeVisible({ timeout: 8_000 });

  // Capture vote response
  const voteResponse = page.waitForResponse(
    (r) => r.url().includes(`/polls/${pollId}/vote`) && r.request().method() === "POST",
    { timeout: 10_000 }
  );

  // Click the "Sim" option button
  await pollCard.getByText("Sim").click();

  const resp = await voteResponse;
  expect(resp.status()).toBe(200);

  // "Sim" option should now show 100% (only voter)
  await expect(pollCard.getByText("100%")).toBeVisible({ timeout: 5_000 });
  // Vote indicator checkmark should appear (isMyVote = true)
  const simOption = pollCard.locator("button").filter({ hasText: "Sim" });
  await expect(simOption).toHaveClass(/border-primary/, { timeout: 3_000 });
});

// ---------------------------------------------------------------------------
// Test 4 — close a poll via UI
// ---------------------------------------------------------------------------
test("owner can close a poll", async ({ page }) => {
  if (!pollId) test.skip(true, "Depends on poll created in test 2");

  await browserLogin(page);
  await page.goto(`/groups/${groupId}/`);
  await page.waitForLoadState("domcontentloaded");
  await page.getByRole("button", { name: /enquetes/i }).click();

  const pollCard = page.locator(".bg-card").filter({ hasText: "Sim" }).first();
  await expect(pollCard).toBeVisible({ timeout: 8_000 });

  // Close button (the square-X icon button)
  const closeBtn = pollCard.getByTitle("Encerrar enquete");
  await expect(closeBtn).toBeVisible({ timeout: 3_000 });

  const closeResponse = page.waitForResponse(
    (r) => r.url().includes(`/polls/${pollId}/close`) && r.request().method() === "POST",
    { timeout: 10_000 }
  );

  await closeBtn.click();

  const resp = await closeResponse;
  expect(resp.status()).toBe(200);

  // Badge should change to "Encerrada"
  await expect(pollCard.getByText("Encerrada")).toBeVisible({ timeout: 5_000 });
  // Option buttons should be disabled (cursor-default class)
  const simOption = pollCard.locator("button").filter({ hasText: "Sim" });
  await expect(simOption).toHaveClass(/cursor-default/, { timeout: 3_000 });
});

// ---------------------------------------------------------------------------
// Test 5 — API smoke: list polls endpoint returns the created poll
// ---------------------------------------------------------------------------
test("GET /groups/:id/polls returns the poll", async ({ playwright }) => {
  if (!pollId) test.skip(true, "Depends on poll created in test 2");

  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const res = await ctx.get(`/api/v1/groups/${groupId}/polls`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const polls = await res.json();
  expect(Array.isArray(polls)).toBeTruthy();
  expect(polls.some((p: { id: number }) => p.id === pollId)).toBeTruthy();
  await ctx.dispose();
});
