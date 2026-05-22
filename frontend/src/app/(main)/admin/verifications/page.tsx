"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { adminVerificationApi } from "@/lib/api";
import type { AdminVerificationListItem } from "@bairronow/shared-types";

export default function AdminVerificationsPage() {
  const [items, setItems] = useState<AdminVerificationListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [forbidden, setForbidden] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminVerificationApi.listPending(0, 20);
      setItems(data.items);
      setTotal(data.total);
    } catch (e: unknown) {
      const status = (e as { response?: { status?: number } })?.response?.status;
      if (status === 403) {
        setForbidden(true);
      } else {
        setError(e instanceof Error ? e.message : "Erro ao listar verificacoes");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (id: number) => {
    setBusyId(id);
    try {
      await adminVerificationApi.approve(id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao aprovar");
    } finally {
      setBusyId(null);
    }
  };

  const handleReject = async (id: number) => {
    const reason = window.prompt("Motivo da rejeicao:");
    if (!reason) return;
    setBusyId(id);
    try {
      await adminVerificationApi.reject(id, reason);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao rejeitar");
    } finally {
      setBusyId(null);
    }
  };

  if (forbidden) {
    return (
      <Card padding="md">
        <h1 className="text-2xl font-extrabold text-fg">Acesso negado</h1>
        <p className="mt-2 text-fg/70 font-medium">
          Voce nao tem permissao para acessar esta area.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-fg">
          Verificacoes pendentes
        </h1>
        <span className="text-sm font-semibold text-fg/70">
          Total: {total}
        </span>
      </header>

      {error && <p className="text-sm text-danger font-semibold">{error}</p>}

      {loading ? (
        <div className="space-y-2 overflow-x-auto">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4 bg-bg border border-border rounded-lg p-3 animate-pulse">
              <div className="h-4 bg-muted rounded w-40" />
              <div className="h-4 bg-muted rounded w-20" />
              <div className="h-4 bg-muted rounded w-28" />
              <div className="h-4 bg-muted rounded w-16 ml-auto" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card padding="md">
          <p className="text-fg/70 font-medium">
            Nenhuma verificacao pendente.
          </p>
        </Card>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="text-left font-bold text-fg/70 border-b-2 border-border">
                <th className="px-3 py-2">Email</th>
                <th className="px-3 py-2">CEP</th>
                <th className="px-3 py-2">Bairro</th>
                <th className="px-3 py-2">Duplicado?</th>
                <th className="px-3 py-2">Comprovante</th>
                <th className="px-3 py-2">Acoes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b border-border">
                  <td className="px-3 py-2 font-medium">{it.userEmail}</td>
                  <td className="px-3 py-2 font-medium">{it.cep}</td>
                  <td className="px-3 py-2 font-medium">
                    {it.bairroNome ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {it.isSuspectedDuplicate ? (
                      <Badge variant="accent">Suspeita</Badge>
                    ) : (
                      <span className="text-fg/40">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <a
                      href={adminVerificationApi.getProofUrl(it.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-primary hover:text-primary-hover underline"
                    >
                      Abrir
                    </a>
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="primary"
                        onClick={() => handleApprove(it.id)}
                        loading={busyId === it.id}
                      >
                        Aprovar
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => handleReject(it.id)}
                        loading={busyId === it.id}
                      >
                        Rejeitar
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
