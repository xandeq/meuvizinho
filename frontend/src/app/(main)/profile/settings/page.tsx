"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import api from "@/lib/api";
import { useSettingsStore } from "@/stores/settings-store";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function SettingsPage() {
  const { digestOptOut, loadSettings, toggleDigest, loading } =
    useSettingsStore();

  const [exportLoading, setExportLoading] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState(false);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const handleExport = async () => {
    setExportLoading(true);
    setExportMsg(null);
    try {
      const response = await api.get("/api/v1/account/export", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "bairronow-meus-dados.json");
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      setExportMsg("Dados exportados com sucesso.");
    } catch {
      setExportMsg("Erro ao exportar dados. Tente novamente em 24 horas.");
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async () => {
    setDeleteLoading(true);
    setDeleteMsg(null);
    try {
      const { data } = await api.post<{
        message: string;
        deletionDate: string;
      }>("/api/v1/account/delete");
      setPendingDeletion(true);
      setDeleteMsg(
        `Conta agendada para exclusao em ${new Date(data.deletionDate).toLocaleDateString("pt-BR")}. Voce pode cancelar durante este periodo.`
      );
      setShowDeleteConfirm(false);
    } catch {
      setDeleteMsg("Erro ao solicitar exclusao. Tente novamente.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleCancelDelete = async () => {
    setDeleteLoading(true);
    try {
      await api.post("/api/v1/account/delete/cancel");
      setPendingDeletion(false);
      setDeleteMsg("Exclusao cancelada com sucesso.");
    } catch {
      setDeleteMsg("Erro ao cancelar exclusao.");
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto animate-slide-up">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold text-fg">Configuracoes</h1>
        <Link
          href="/profile/"
          className="text-sm text-primary font-semibold hover:underline"
        >
          Voltar ao perfil
        </Link>
      </header>

      {/* Notifications */}
      <Card padding="md">
        <h2 className="text-lg font-bold text-fg mb-4">Notificacoes</h2>
        <label className="flex items-center justify-between cursor-pointer">
          <div>
            <p className="font-semibold text-fg">
              Receber resumo semanal do bairro
            </p>
            <p className="text-sm text-fg/60">
              E-mail com as novidades da semana no seu bairro
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={!digestOptOut}
            onClick={toggleDigest}
            disabled={loading}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              !digestOptOut ? "bg-primary" : "bg-border"
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white transition-transform duration-200 ease-in-out ${
                !digestOptOut ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </label>
      </Card>

      {/* LGPD Data Export */}
      <Card padding="md">
        <h2 className="text-lg font-bold text-fg mb-2">Meus Dados (LGPD)</h2>
        <p className="text-sm text-fg/60 mb-4">
          Exporte todos os seus dados pessoais armazenados na plataforma.
          Limitado a 1 exportacao por 24 horas.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={handleExport}
          loading={exportLoading}
        >
          Exportar meus dados
        </Button>
        {exportMsg && (
          <p className="text-sm font-medium mt-2 text-fg/70">{exportMsg}</p>
        )}
      </Card>

      {/* Account Deletion */}
      <Card padding="md">
        <h2 className="text-lg font-bold text-danger mb-2">Excluir Conta</h2>
        <p className="text-sm text-fg/60 mb-4">
          Seus dados serao anonimizados apos 30 dias. Voce pode cancelar
          durante este periodo.
        </p>

        {deleteMsg && (
          <p className="text-sm font-medium mb-4 text-fg/70">{deleteMsg}</p>
        )}

        {pendingDeletion ? (
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelDelete}
            loading={deleteLoading}
          >
            Cancelar exclusao
          </Button>
        ) : showDeleteConfirm ? (
          <div className="space-y-3">
            <p className="text-sm text-danger font-semibold">
              Tem certeza? Esta acao agendara a exclusao da sua conta em 30
              dias.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleDelete}
                disabled={deleteLoading}
                className="px-4 py-2 bg-danger text-white font-bold rounded-lg hover:bg-danger-hover transition-colors disabled:opacity-50"
              >
                {deleteLoading ? "Processando..." : "Sim, excluir minha conta"}
              </button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border-2 border-danger text-danger font-bold rounded-lg hover:bg-danger hover:text-white transition-colors"
          >
            Solicitar exclusao da conta
          </button>
        )}
      </Card>
    </div>
  );
}
