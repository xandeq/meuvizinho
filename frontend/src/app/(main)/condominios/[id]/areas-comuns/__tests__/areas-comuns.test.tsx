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
const mockGetCommonAreas = jest.fn();
const mockGetCommonArea = jest.fn();
const mockGetAreaAvailability = jest.fn();
const mockCreateReservation = jest.fn();

jest.mock('@/lib/api/reservations', () => ({
  getMyResidentStatus: (...args: unknown[]) => mockGetMyResidentStatus(...args),
  getCommonAreas: (...args: unknown[]) => mockGetCommonAreas(...args),
  getCommonArea: (...args: unknown[]) => mockGetCommonArea(...args),
  getAreaAvailability: (...args: unknown[]) => mockGetAreaAvailability(...args),
  createReservation: (...args: unknown[]) => mockCreateReservation(...args),
}));

import AreasComunsClient from '../AreasComunsClient';
import AreaDetailClient from '../[areaId]/AreaDetailClient';

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

function futureDateStr(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

describe('AreasComunsClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/condominios/1/areas-comuns/' },
      writable: true,
      configurable: true,
    });
  });

  it('renderiza a lista de áreas comuns para um morador aprovado', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'Approved', unit: 'Bloco B, Apto 302', reviewNote: null });
    mockGetCommonAreas.mockResolvedValue([
      {
        id: 10, condominiumId: 1, name: 'Salão de festas', description: 'Espaço para eventos',
        coverImageUrl: null, capacity: 50, requiresApproval: true, openTime: '08:00:00', closeTime: '22:00:00',
        isActive: true,
      },
    ]);

    render(<AreasComunsClient />);

    await waitFor(() => expect(screen.getByText('Salão de festas')).toBeInTheDocument());
    expect(screen.getByText('Até 50 pessoas')).toBeInTheDocument();
    expect(screen.getByText('Aprovação do síndico')).toBeInTheDocument();
  });

  it('mostra CTA de vínculo quando o usuário não é morador aprovado, sem chamar a API de áreas', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'None', unit: null, reviewNote: null });

    render(<AreasComunsClient />);

    await waitFor(() => expect(screen.getByText('Você ainda não é morador confirmado aqui')).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Solicitar vínculo de morador/i })).toBeInTheDocument();
    expect(mockGetCommonAreas).not.toHaveBeenCalled();
  });

  it('mostra estado vazio quando não há áreas comuns cadastradas', async () => {
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'Approved', unit: null, reviewNote: null });
    mockGetCommonAreas.mockResolvedValue([]);

    render(<AreasComunsClient />);

    await waitFor(() => expect(screen.getByText('Nenhuma área comum cadastrada ainda')).toBeInTheDocument());
  });
});

describe('AreaDetailClient', () => {
  const AREA = {
    id: 10, condominiumId: 1, name: 'Salão de festas', description: null, coverImageUrl: null,
    capacity: 50, requiresApproval: false, openTime: null, closeTime: null, isActive: true,
    rules: null, minAdvanceHours: 0, maxAdvanceDays: 90, maxDurationMinutes: null,
    createdByUserId: null, createdAt: '2026-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(window, 'location', {
      value: { pathname: '/condominios/1/areas-comuns/10/' },
      writable: true,
      configurable: true,
    });
    mockGetCondominium.mockResolvedValue(CONDO);
    mockGetMyResidentStatus.mockResolvedValue({ status: 'Approved', unit: 'Bloco B, Apto 302', reviewNote: null });
    mockGetCommonArea.mockResolvedValue(AREA);
    mockGetAreaAvailability.mockResolvedValue([]);
  });

  it('envia uma reserva com sucesso e mostra a confirmação', async () => {
    const dateStr = futureDateStr(10);
    mockCreateReservation.mockResolvedValue({
      id: 1, commonAreaId: 10, commonAreaName: 'Salão de festas', condominiumId: 1, userId: 'u1', userName: 'Test',
      title: null, guestsCount: null, startUtc: `${dateStr}T14:00:00.000Z`, endUtc: `${dateStr}T16:00:00.000Z`,
      status: 'Approved', reviewedByUserId: null, reviewedAt: null, reviewNote: null, cancelledAt: null,
      createdAt: '2026-01-01T00:00:00Z',
    });

    render(<AreaDetailClient />);

    await waitFor(() => expect(screen.getByText('Nova reserva')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: dateStr } });
    fireEvent.change(screen.getByLabelText('Horário de início'), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText('Horário de término'), { target: { value: '16:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar reserva/i }));

    await waitFor(() => expect(mockCreateReservation).toHaveBeenCalledTimes(1));
    expect(mockCreateReservation).toHaveBeenCalledWith(1, 10, expect.objectContaining({
      startUtc: expect.any(String),
      endUtc: expect.any(String),
    }));

    await waitFor(() => expect(screen.getByText('Reserva confirmada!')).toBeInTheDocument());
  });

  it('bloqueia o envio no cliente quando o horário conflita com uma reserva existente', async () => {
    const dateStr = futureDateStr(10);
    // O bloco ocupado é calculado a partir do mesmo horário local que será digitado no
    // formulário, garantindo sobreposição independentemente do fuso horário do ambiente de teste.
    const chosenStart = new Date(`${dateStr}T14:00`);
    const busyStart = new Date(chosenStart.getTime() - 30 * 60_000).toISOString();
    const busyEnd = new Date(chosenStart.getTime() + 30 * 60_000).toISOString();
    mockGetAreaAvailability.mockResolvedValue([{ startUtc: busyStart, endUtc: busyEnd, status: 'Approved' }]);

    render(<AreaDetailClient />);

    await waitFor(() => expect(screen.getByText('Nova reserva')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: dateStr } });
    await waitFor(() => expect(screen.getByText(/Já reservado:/i)).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Horário de início'), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText('Horário de término'), { target: { value: '16:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar reserva/i }));

    expect(await screen.findByText('Esse horário já está reservado. Escolha outro horário.')).toBeInTheDocument();
    expect(mockCreateReservation).not.toHaveBeenCalled();
  });

  it('mostra o erro de conflito retornado pela API (409) quando ocorre uma corrida de horários', async () => {
    const dateStr = futureDateStr(10);
    mockCreateReservation.mockRejectedValue({
      response: { status: 409, data: { error: 'Esse horário já está reservado. Escolha outro horário.' } },
    });

    render(<AreaDetailClient />);

    await waitFor(() => expect(screen.getByText('Nova reserva')).toBeInTheDocument());

    fireEvent.change(screen.getByLabelText('Data'), { target: { value: dateStr } });
    fireEvent.change(screen.getByLabelText('Horário de início'), { target: { value: '14:00' } });
    fireEvent.change(screen.getByLabelText('Horário de término'), { target: { value: '16:00' } });

    fireEvent.click(screen.getByRole('button', { name: /Confirmar reserva/i }));

    expect(await screen.findByText('Esse horário já está reservado. Escolha outro horário.')).toBeInTheDocument();
  });
});
