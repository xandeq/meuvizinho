import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

const mockReplace = jest.fn();
let mockToken: string | null = 'tok-123';

jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSearchParams: () => ({ get: (k: string) => (k === 'token' ? mockToken : null) }),
}));

const mockJoinByInvite = jest.fn();
jest.mock('@/lib/api/groups', () => ({
  joinGroupByInvite: (...args: unknown[]) => mockJoinByInvite(...args),
}));

import GroupJoinPage from '../page';

describe('GroupJoinPage', () => {
  beforeEach(() => {
    mockReplace.mockReset();
    mockJoinByInvite.mockReset();
    mockToken = 'tok-123';
  });

  it('token válido: entra e redireciona para o grupo', async () => {
    mockJoinByInvite.mockResolvedValue({ groupId: 7, status: 'Active' });
    render(<GroupJoinPage />);
    expect(screen.getByText(/Entrando no grupo/i)).toBeInTheDocument();
    await waitFor(() => expect(mockJoinByInvite).toHaveBeenCalledWith('tok-123'));
    await waitFor(() => expect(mockReplace).toHaveBeenCalledWith('/groups/7/'));
  });

  it('convite expirado: mostra erro do servidor', async () => {
    mockJoinByInvite.mockRejectedValue({ response: { data: { error: 'Convite inválido ou expirado.' } } });
    render(<GroupJoinPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Convite inválido ou expirado.');
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('sem token na URL: erro imediato sem chamar API', async () => {
    mockToken = null;
    render(<GroupJoinPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/Link de convite inválido/i);
    expect(mockJoinByInvite).not.toHaveBeenCalled();
  });

  it('falha genérica: mensagem de fallback', async () => {
    mockJoinByInvite.mockRejectedValue(new Error('network'));
    render(<GroupJoinPage />);
    expect(await screen.findByRole('alert')).toHaveTextContent(/pode ter expirado/i);
  });
});
