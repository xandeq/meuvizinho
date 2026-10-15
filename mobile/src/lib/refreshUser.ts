import { profileApi } from './api';
import { useAuthStore } from './auth-store';

/**
 * Atualiza o usuário salvo no aparelho com o perfil do servidor. Antes, depois de a
 * verificação ser aprovada, o app seguia com bairroId nulo e isVerified falso: a pessoa via
 * "Confirme seu endereço" mesmo aprovada, até sair e entrar de novo.
 */
export async function refreshUserFromProfile(): Promise<boolean> {
  const current = useAuthStore.getState().user;
  if (!current) return false;
  const p = await profileApi.getMe();
  useAuthStore.setState({
    user: {
      ...current,
      displayName: p.displayName ?? current.displayName,
      isVerified: p.isVerified,
      bairroId: p.bairroId ?? current.bairroId,
      bairroName: p.bairroNome ?? current.bairroName,
    },
  });
  return p.isVerified && (p.bairroId ?? current.bairroId) != null;
}
