import { test, expect, Page } from "@playwright/test";

// Usuário autenticado injetado no localStorage (formato do zustand persist).
const AUTH = {
  state: {
    accessToken: "e2e-fake-token",
    user: {
      id: "11111111-1111-1111-1111-111111111111",
      email: "e2e@meuvizinho.test",
      displayName: "Vizinho E2E",
      bairroId: 1,
      isAdmin: false,
      isVerified: true,
    },
    isAuthenticated: true,
  },
  version: 0,
};

async function bootAuthedPage(page: Page) {
  await page.addInitScript((auth) => {
    localStorage.setItem("bairronow-auth", JSON.stringify(auth));
  }, AUTH);
  // Silencia chamadas não relacionadas (header: chat/notificações/signalr).
  await page.route("**/api/v1/chat/**", (r) => r.fulfill({ json: { items: [], total: 0 } }));
  await page.route("**/api/v1/notifications**", (r) => r.fulfill({ json: [] }));
  await page.route("**/hubs/**", (r) => r.abort());
}

test.beforeEach(async ({ page }) => {
  await bootAuthedPage(page);
});

test("diretório de WhatsApp renderiza os grupos verificados da API", async ({ page }) => {
  await page.route("**/api/v1/whatsapp-groups?*", (route) =>
    route.fulfill({
      json: [
        {
          id: 1, name: "Condomínio Edifício Solar", description: "Grupo oficial do prédio",
          kind: "Condominio", coverImageUrl: null, memberCountApprox: 120,
          isManagedByPlatform: true, clickCount: 5, condominiumId: null, condominiumName: null,
          createdAt: "2026-06-23T00:00:00Z",
        },
        {
          id: 2, name: "Rua das Flores", description: "Vizinhança da rua",
          kind: "Rua", coverImageUrl: null, memberCountApprox: 30,
          isManagedByPlatform: false, clickCount: 1, condominiumId: null, condominiumName: null,
          createdAt: "2026-06-23T00:00:00Z",
        },
      ],
    }),
  );

  await page.goto("/whatsapp/");

  await expect(page.getByRole("heading", { name: "Grupos de WhatsApp" })).toBeVisible();
  await expect(page.getByText("Condomínio Edifício Solar")).toBeVisible();
  await expect(page.getByText("Rua das Flores")).toBeVisible();
  await expect(page.getByTestId("whatsapp-card")).toHaveCount(2);
  // Badge "Oficial" presente (grupo gerido pela plataforma).
  await expect(page.getByText("Oficial").first()).toBeVisible();
  // CTA de entrada no grupo (um por card).
  await expect(page.getByRole("button", { name: /Entrar no grupo/ })).toHaveCount(2);
});

test("diretório vazio mostra estado vazio com CTA", async ({ page }) => {
  await page.route("**/api/v1/whatsapp-groups?*", (route) => route.fulfill({ json: [] }));
  await page.goto("/whatsapp/");
  await expect(page.getByText("Nenhum grupo ainda")).toBeVisible();
});

test("formulário valida o link e envia o grupo para moderação", async ({ page }) => {
  let postedBody: Record<string, unknown> | null = null;
  await page.route("**/api/v1/whatsapp-groups", (route) => {
    if (route.request().method() === "POST") {
      postedBody = route.request().postDataJSON();
      return route.fulfill({ status: 201, json: { id: 99, status: "PendingReview" } });
    }
    return route.fulfill({ json: [] });
  });

  await page.goto("/whatsapp/new/");
  await expect(page.getByRole("heading", { name: /Adicionar grupo de WhatsApp/ })).toBeVisible();

  await page.getByPlaceholder("Ex: Condomínio Edifício Solar").fill("Grupo do Bairro Centro");
  // Link inválido → erro de validação (zod), sem POST.
  await page.getByPlaceholder("https://chat.whatsapp.com/...").fill("https://t.me/errado");
  await page.getByRole("button", { name: /Enviar para verificação/ }).click();
  await expect(page.getByText(/Cole o link de convite/)).toBeVisible();
  expect(postedBody).toBeNull();

  // Link válido → POST + tela de sucesso.
  await page.getByPlaceholder("https://chat.whatsapp.com/...").fill("https://chat.whatsapp.com/AbCdEf123456");
  await page.getByRole("button", { name: /Enviar para verificação/ }).click();
  await expect(page.getByText("Enviado para verificação")).toBeVisible();
  expect(postedBody).toMatchObject({ name: "Grupo do Bairro Centro", inviteUrl: "https://chat.whatsapp.com/AbCdEf123456", kind: "Condominio" });
});

test("lista de condomínios renderiza com síndico e contagem de grupos", async ({ page }) => {
  await page.route("**/api/v1/condominiums?*", (route) =>
    route.fulfill({
      json: [
        {
          id: 1, name: "Residencial Atlântico", description: null, addressLine: "Av. Beira-Mar, 100",
          cep: null, coverImageUrl: null, unitsCount: null, status: "Claimed",
          sindicoName: "João Síndico", groupCount: 2, createdAt: "2026-06-23T00:00:00Z",
        },
      ],
    }),
  );

  await page.goto("/condominios/");
  await expect(page.getByRole("heading", { name: "Condomínios" })).toBeVisible();
  await expect(page.getByText("Residencial Atlântico")).toBeVisible();
  await expect(page.getByText(/Síndico: João Síndico/)).toBeVisible();
  await expect(page.getByText("Com síndico")).toBeVisible();
});
