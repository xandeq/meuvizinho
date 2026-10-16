import { apiErrorMessage } from "../apiError";

describe("apiErrorMessage", () => {
  it("usa o erro da API", () => {
    expect(apiErrorMessage({ isAxiosError: true, response: { data: { error: "Nome muito curto" } } }, "x")).toBe("Nome muito curto");
  });
  it("usa a 1ª mensagem de validação (ProblemDetails)", () => {
    expect(apiErrorMessage({ isAxiosError: true, response: { data: { title: "One or more...", errors: { DisplayName: ["Informe o nome"] } } } }, "x")).toBe("Informe o nome");
  });
  it("sem resposta = sem conexão", () => {
    expect(apiErrorMessage({ isAxiosError: true }, "x")).toMatch(/Sem conexão/);
  });
  it("erro desconhecido cai no texto padrão", () => {
    expect(apiErrorMessage(new Error("Request failed with status code 400"), "Erro ao salvar perfil")).toBe("Erro ao salvar perfil");
  });
});
