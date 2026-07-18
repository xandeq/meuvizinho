import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

jest.mock('next/link', () => {
  const Link = ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  );
  Link.displayName = 'Link';
  return Link;
});

jest.mock('@/lib/auth', () => ({
  useAuthStore: (selector: (s: { user: { id: string; isAdmin: boolean } | null }) => unknown) =>
    selector({ user: { id: 'u1', isAdmin: false } }),
}));

const mockGetCondominium = jest.fn();
jest.mock('@/lib/api/community', () => ({
  getCondominium: (...args: unknown[]) => mockGetCondominium(...args),
}));

const mockGetMyResidentStatus = jest.fn();
jest.mock('@/lib/api/reservations', () => ({
  getMyResidentStatus: (...args: unknown[]) => mockGetMyResidentStatus(...args),
}));

const mockGetAnnouncements = jest.fn();
const mockGetManagedAnnouncements = jest.fn();
const mockGetAnnouncement = jest.fn();
const mockCreateAnnouncement = jest.fn();
const mockUpdateAnnouncement = jest.fn();
const mockDeleteAnnouncement = jest.fn();
const mockPinAnnouncement = jest.fn();
const mockUnpinAnnouncement = jest.fn();

jest.mock('@/lib/api/announcements', () => ({
  getAnnouncements: (...args: unknown[]) => mockGetAnnouncements(...args),
  getManagedAnnouncements: (...args: unknown[]) => mockGetManagedAnnouncements(...args),
  getAnnouncement: (...args: unknown[]) => mockGetAnnouncement(...args),
  createAnnouncement: (...args: unknown[]) => mockCreateAnnouncement(...args),
  updateAnnouncement: (...args: unknown[]) => mockUpdateAnnouncement(...args),
  deleteAnnouncement: (...args: unknown[]) => mockDeleteAnnouncement(...args),
  pinAnnouncement: (...args: unknown[]) => mockPinAnnouncement(...args),
  unpinAnnouncement: (...args: unknown[]) => mockUnpinAnnouncement(...args),
}));

import ComunicadosClient from '../ComunicadosClient';
import GerenciarComunicadosClient from '../../gerenciar/comunicados/GerenciarComunicadosClient';

const CONDO = {
  id: 1,
  bairroId: 1,
  name: 'Edifício Solar',
  description: null,
  addressLine: null,
  cep: null,
  coverImageUrl: null,
  unitsCount: null,
  status: 'Claimed',
  sindicoUserId: 'sindico-1',
  sindicoName: 'João Síndico',
  sindicoRole: 'Sindico',
  isManagedByPlatform: false,
  createdAt: '2026-01-01T00:00:00Z',
  groups: [],
  myClaimStatus: null,
  isMySindico: false,
};

describe('ComunicadosClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/condominios/1/comunicados/', assign: jest.fn() },
      writable: true,
      configurable: true,
    });
  });

  it('renderiza a lista de comunicados para um morador aprovado', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'Approved', unit: 'Bloco B, Apto 302', reviewNote: null });
    mockGetAnnouncements.mockResolvedValue([
      {
        id: 1, title: 'Manutenção da caixa d\'água', bodyPreview: 'Amanhã haverá interrupção no fornecimento de água.',
        isImportant: true, isPinned: false, publishedAt: '2026-07-10T10:00:00Z', expiresAt: null,
        authorName: 'João Síndico', authorVerified: true,
      },
    ]);

    render(<ComunicadosClient />);

    await waitFor(() => expect(screen.getByText("Manutenção da caixa d'água")).toBeInTheDocument());
    expect(screen.getByText('Amanhã haverá interrupção no fornecimento de água.')).toBeInTheDocument();
    expect(screen.getByText('Importante')).toBeInTheDocument();
  });

  it('mostra o comunicado fixado antes dos demais, mesmo se a API devolver fora de ordem', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'Approved', unit: null, reviewNote: null });
    mockGetAnnouncements.mockResolvedValue([
      {
        id: 1, title: 'Comunicado recente (não fixado)', bodyPreview: 'Aviso comum.',
        isImportant: false, isPinned: false, publishedAt: '2026-07-15T10:00:00Z', expiresAt: null,
        authorName: 'João Síndico', authorVerified: true,
      },
      {
        id: 2, title: 'Comunicado fixado', bodyPreview: 'Aviso fixado no topo.',
        isImportant: false, isPinned: true, publishedAt: '2026-07-01T10:00:00Z', expiresAt: null,
        authorName: 'João Síndico', authorVerified: true,
      },
    ]);

    render(<ComunicadosClient />);

    await waitFor(() => expect(screen.getByText('Comunicado fixado')).toBeInTheDocument());

    const titles = screen.getAllByText(/Comunicado (recente|fixado)/).map((el) => el.textContent);
    expect(titles[0]).toBe('Comunicado fixado');
    expect(titles[1]).toBe('Comunicado recente (não fixado)');
  });

  it('mostra estado vazio quando não há comunicados publicados', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'Approved', unit: null, reviewNote: null });
    mockGetAnnouncements.mockResolvedValue([]);

    render(<ComunicadosClient />);

    await waitFor(() => expect(screen.getByText('Nenhum comunicado ainda')).toBeInTheDocument());
  });

  it('mostra CTA de vínculo quando o usuário não é morador aprovado, sem chamar a API de comunicados', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'None', unit: null, reviewNote: null });

    render(<ComunicadosClient />);

    await waitFor(() => expect(screen.getByText('Você ainda não é morador confirmado aqui')).toBeInTheDocument());
    expect(mockGetAnnouncements).not.toHaveBeenCalled();
  });
});

describe('GerenciarComunicadosClient', () => {
  const CONDO_SINDICO = { ...CONDO, isMySindico: true };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/condominios/1/gerenciar/comunicados/', assign: jest.fn() },
      writable: true,
      configurable: true,
    });
  });

  it('publica um novo comunicado com sucesso e atualiza a lista', async () => {
    mockGetCondominium.mockResolvedValue(CONDO_SINDICO);
    mockGetManagedAnnouncements
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 5, title: 'Assembleia geral', bodyPreview: 'Convocação para assembleia geral ordinária.',
          isImportant: false, isPinned: false, publishedAt: '2026-07-18T12:00:00Z', expiresAt: null,
          authorName: 'João Síndico', authorVerified: true, isExpired: false, deletedAt: null,
        },
      ]);
    mockCreateAnnouncement.mockResolvedValue({ id: 5 });

    render(<GerenciarComunicadosClient />);

    await waitFor(() => expect(screen.getByText('Gerenciar comunicados')).toBeInTheDocument());
    expect(screen.getByText('Nenhum comunicado cadastrado ainda.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Novo comunicado' }));

    fireEvent.change(screen.getByPlaceholderText("Ex: Manutenção da caixa d'água"), {
      target: { value: 'Assembleia geral' },
    });
    fireEvent.change(screen.getByPlaceholderText('Escreva o comunicado completo...'), {
      target: { value: 'Convocação para assembleia geral ordinária.' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Publicar comunicado' }));

    await waitFor(() => expect(mockCreateAnnouncement).toHaveBeenCalledTimes(1));
    expect(mockCreateAnnouncement).toHaveBeenCalledWith(1, expect.objectContaining({
      title: 'Assembleia geral',
      body: 'Convocação para assembleia geral ordinária.',
      isImportant: false,
      isPinned: false,
    }));

    await waitFor(() => expect(screen.getByText('Assembleia geral')).toBeInTheDocument());
    expect(mockGetManagedAnnouncements).toHaveBeenCalledTimes(2);
  });

  it('bloqueia o acesso de quem não é síndico nem admin', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);

    render(<GerenciarComunicadosClient />);

    await waitFor(() => expect(screen.getByText('Acesso negado')).toBeInTheDocument());
    expect(mockGetManagedAnnouncements).not.toHaveBeenCalled();
  });
});
