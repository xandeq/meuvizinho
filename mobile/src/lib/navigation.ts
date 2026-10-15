import type { Href, Router } from 'expo-router';

// Telas abertas direto (link, notificação) não têm para onde voltar: router.back() não faz nada
// e o usuário fica parado no formulário já enviado. Aí vamos para o destino padrão.
export function goBackOr(router: Router, fallback: Href) {
  if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
