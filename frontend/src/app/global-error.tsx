"use client";

import Link from "next/link";

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="pt-BR">
      <body>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
          <h2 className="text-2xl font-semibold text-fg">Algo deu errado</h2>
          <p className="text-muted-fg max-w-md">
            Ocorreu um erro inesperado. Tente novamente ou volte para a página
            inicial.
          </p>
          <div className="flex gap-3">
            <button
              onClick={reset}
              className="rounded-lg bg-primary px-4 py-2 font-medium text-white hover:bg-primary-hover"
            >
              Tentar novamente
            </button>
            <Link
              href="/"
              className="rounded-xl border border-border/50 px-4 py-2 font-medium text-fg hover:bg-muted"
            >
              Página inicial
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
