/**
 * premium-screen.test.tsx
 *
 * Verifies (project style: pure logic, no RN render):
 *  - statusTitle / statusHint cover free-eligible, trial-used, trial-active,
 *    paid premium, singular/plural days and expiring-today states
 */

jest.mock('expo-constants', () => ({
  default: {
    expoConfig: { extra: { apiUrl: 'https://api.example.com', kiwifyCheckoutUrl: '' } },
    isDevice: false,
  },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn().mockResolvedValue(null),
  setItem: jest.fn().mockResolvedValue(undefined),
  removeItem: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../../../lib/api', () => ({
  apiClient: { get: jest.fn(), post: jest.fn() },
}));

import { statusTitle, statusHint, type SubscriptionStatus } from '../premium-logic';

function s(overrides: Partial<SubscriptionStatus> = {}): SubscriptionStatus {
  return {
    plan: 'free',
    planExpiresAt: null,
    isOnTrial: false,
    isEligibleForTrial: true,
    daysRemaining: null,
    ...overrides,
  };
}

describe('PremiumScreen status logic', () => {
  it('free elegível', () => {
    expect(statusTitle(s())).toBe('Você está no plano gratuito');
    expect(statusHint(s())).toMatch(/14 dias — sem cartão/);
  });

  it('free com trial já usado', () => {
    const st = s({ isEligibleForTrial: false });
    expect(statusHint(st)).toMatch(/trial já foi utilizado/i);
  });

  it('premium em trial com plural de dias', () => {
    const st = s({ plan: 'premium', isOnTrial: true, isEligibleForTrial: false, daysRemaining: 10 });
    expect(statusTitle(st)).toBe('Plano Premium ativo (trial)');
    expect(statusHint(st)).toBe('10 dias restantes');
  });

  it('premium pago com 1 dia (singular)', () => {
    const st = s({ plan: 'premium', isEligibleForTrial: false, daysRemaining: 1 });
    expect(statusTitle(st)).toBe('Plano Premium ativo');
    expect(statusHint(st)).toBe('1 dia restante');
  });

  it('premium expirando hoje (0 dias)', () => {
    const st = s({ plan: 'premium', isEligibleForTrial: false, daysRemaining: 0 });
    expect(statusHint(st)).toBe('Expira hoje');
  });
});
