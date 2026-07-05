export interface SubscriptionStatus {
  plan: 'free' | 'premium';
  planExpiresAt: string | null;
  isOnTrial: boolean;
  isEligibleForTrial: boolean;
  daysRemaining: number | null;
}


// Lógica de apresentação pura — exportada para teste unitário
export function statusTitle(s: SubscriptionStatus): string {
  if (s.plan !== 'premium') return 'Você está no plano gratuito';
  return `Plano Premium ativo${s.isOnTrial ? ' (trial)' : ''}`;
}

export function statusHint(s: SubscriptionStatus): string {
  if (s.plan === 'premium') {
    if (s.daysRemaining != null && s.daysRemaining > 0)
      return `${s.daysRemaining} ${s.daysRemaining === 1 ? 'dia restante' : 'dias restantes'}`;
    return 'Expira hoje';
  }
  return s.isEligibleForTrial
    ? 'Experimente grátis por 14 dias — sem cartão de crédito.'
    : 'Seu trial já foi utilizado. Assine para voltar ao Premium.';
}
