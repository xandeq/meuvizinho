import { defineConfig, devices } from "@playwright/test";

// Wave P — E2E do diferencial (WhatsApp + Condomínios) contra o export estático
// real, com a API mockada por interceptação de rotas. Prova que as páginas
// renderizam e os fluxos funcionam num navegador real.
export default defineConfig({
  testDir: "./tests",
  testMatch: "community.spec.ts",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "off",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "node static-server.mjs",
    url: "http://localhost:3000/",
    reuseExistingServer: true,
    timeout: 30_000,
  },
});
