// Mensagem de erro para o usuário. Sem resposta do servidor = sem conexão
// (antes aparecia só "Falha ao cadastrar", sem dizer o que fazer).
export function apiErrorMessage(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
  if (err && typeof err === 'object' && 'isAxiosError' in err && !err.response) {
    return 'Sem conexão com o servidor. Verifique sua internet e tente de novo.';
  }
  return err?.response?.data?.error || fallback;
}
