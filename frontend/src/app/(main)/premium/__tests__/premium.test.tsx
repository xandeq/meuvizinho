import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockGet = jest.fn();
const mockPost = jest.fn();
jest.mock('@/lib/api', () => ({
  __esModule: true,
  default: {
    get: (...args: unknown[]) => mockGet(...args),
    post: (...args: unknown[]) => mockPost(...args),
  },
}));

import PremiumPage from '../page';

function statusResponse(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    data: {
      plan: 'free',
      planExpiresAt: null,
      isOnTrial: false,
      isEligibleForTrial: true,
      daysRemaining: null,
      ...overrides,
    },
  };
}

describe('PremiumPage', () => {
  beforeEach(() => {
    mockGet.mockReset();
    mockPost.mockReset();
  });

  it('free elegível: mostra CTA de trial', async () => {
    mockGet.mockResolvedValue(statusResponse());
    render(<PremiumPage />);
    expect(await screen.findByText(/plano gratuito/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /trial grátis de 14 dias/i })).toBeInTheDocument();
  });

  it('free com trial usado: não mostra CTA de trial', async () => {
    mockGet.mockResolvedValue(statusResponse({ isEligibleForTrial: false }));
    render(<PremiumPage />);
    expect(await screen.findByText(/trial já foi utilizado/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /trial grátis/i })).not.toBeInTheDocument();
  });

  it('premium em trial: mostra dias restantes', async () => {
    mockGet.mockResolvedValue(statusResponse({
      plan: 'premium',
      isOnTrial: true,
      isEligibleForTrial: false,
      daysRemaining: 10,
      planExpiresAt: '2026-07-14T12:00:00Z',
    }));
    render(<PremiumPage />);
    expect(await screen.findByText(/Premium ativo \(trial\)/i)).toBeInTheDocument();
    expect(screen.getByText(/10 dias restantes/i)).toBeInTheDocument();
  });

  it('ativar trial: chama POST e recarrega status', async () => {
    mockGet
      .mockResolvedValueOnce(statusResponse())
      .mockResolvedValueOnce(statusResponse({
        plan: 'premium', isOnTrial: true, isEligibleForTrial: false, daysRemaining: 14,
      }));
    mockPost.mockResolvedValue({ data: {} });

    render(<PremiumPage />);
    fireEvent.click(await screen.findByRole('button', { name: /trial grátis de 14 dias/i }));

    await waitFor(() => expect(mockPost).toHaveBeenCalledWith('/api/v1/subscription/trial'));
    expect(await screen.findByText(/Trial de 14 dias ativado/i)).toBeInTheDocument();
    expect(await screen.findByText(/Premium ativo \(trial\)/i)).toBeInTheDocument();
  });

  it('erro da API ao ativar trial: exibe mensagem do servidor', async () => {
    mockGet.mockResolvedValue(statusResponse());
    mockPost.mockRejectedValue({ response: { data: { error: 'Trial já utilizado.' } } });

    render(<PremiumPage />);
    fireEvent.click(await screen.findByRole('button', { name: /trial grátis de 14 dias/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent('Trial já utilizado.');
  });

  it('falha ao carregar status: exibe erro', async () => {
    mockGet.mockRejectedValue(new Error('network'));
    render(<PremiumPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Não foi possível carregar/i);
  });
});
