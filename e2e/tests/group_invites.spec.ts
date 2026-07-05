import { test, expect } from "@playwright/test";

const TEST_EMAIL = process.env.E2E_TEST_EMAIL ?? "e2e-test-2026@bairronow-ci.com";
const TEST_PASSWORD = process.env.E2E_TEST_PASSWORD ?? "Teste@2026!";
const API_BASE =
  process.env.PLAYWRIGHT_API_URL ??
  process.env.BAIRRONOW_API_URL ??
  "http://localhost:5000";

test.describe.configure({ mode: "serial" });

let apiToken: string;
let bairroId: number;
let groupId: number;
let inviteToken: string;

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
  bairroId = user?.bairroId ?? 1;

  // Grupo FECHADO — o convite deve dar entrada Active mesmo assim
  const groupRes = await ctx.post("/api/v1/groups", {
    headers: { Authorization: `Bearer ${apiToken}` },
    data: {
      bairroId,
      name: `E2E Invites ${Date.now()}`,
      description: "Grupo temporário criado por E2E — pode ser deletado",
      category: "Outros",
      joinPolicy: "Closed",
      scope: "Bairro",
    },
  });
  if (!groupRes.ok()) {
    await ctx.dispose();
    throw new Error(`Could not create E2E group: ${groupRes.status()}`);
  }
  groupId = (await groupRes.json()).id;
  await ctx.dispose();
});

test.afterAll(async ({ playwright }) => {
  if (!groupId) return;
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  await ctx.delete(`/api/v1/groups/${groupId}`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  await ctx.dispose();
});

test("owner gera convite com token e expiração", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const res = await ctx.post(`/api/v1/groups/${groupId}/invite`, {
    headers: { Authorization: `Bearer ${apiToken}` },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.token).toBeTruthy();
  expect(new Date(body.expiresAt).getTime()).toBeGreaterThan(Date.now());
  inviteToken = body.token;
  await ctx.dispose();
});

test("join por convite retorna Active (owner já membro — idempotente)", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const res = await ctx.post("/api/v1/groups/join/invite", {
    headers: { Authorization: `Bearer ${apiToken}` },
    data: { token: inviteToken },
  });
  expect(res.ok()).toBeTruthy();
  const body = await res.json();
  expect(body.groupId).toBe(groupId);
  expect(body.status).toBe("Active");
  await ctx.dispose();
});

test("token adulterado é rejeitado com 400", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const res = await ctx.post("/api/v1/groups/join/invite", {
    headers: { Authorization: `Bearer ${apiToken}` },
    data: { token: inviteToken.slice(0, -4) + "AAAA" },
  });
  expect(res.status()).toBe(400);
  await ctx.dispose();
});

test("sem auth: join por convite exige login", async ({ playwright }) => {
  const ctx = await playwright.request.newContext({ baseURL: API_BASE });
  const res = await ctx.post("/api/v1/groups/join/invite", {
    data: { token: inviteToken },
  });
  expect(res.status()).toBe(401);
  await ctx.dispose();
});
