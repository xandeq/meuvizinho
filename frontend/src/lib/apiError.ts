// Mensagem de erro para o usuário. Antes as telas mostravam o texto do axios
// ("Request failed with status code 400") em vez do motivo que a API devolve.
export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as {
    isAxiosError?: boolean;
    response?: { data?: { error?: string; message?: string; title?: string; errors?: Record<string, string[]> } };
  };
  if (err?.isAxiosError && !err.response) {
    return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
  }
  const data = err?.response?.data;
  const firstValidation = data?.errors ? Object.values(data.errors).flat()[0] : undefined;
  return data?.error || data?.message || firstValidation || fallback;
}
