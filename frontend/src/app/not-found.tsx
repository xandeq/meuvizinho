import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-primary-light text-primary flex items-center justify-center" aria-hidden>
        <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7z" />
          <path d="M10 8l4 4M14 8l-4 4" />
        </svg>
      </div>
      <div className="space-y-2">
        <p className="text-sm font-semibold uppercase tracking-widest text-primary">Erro 404</p>
        <h1 className="text-3xl font-extrabold text-fg tracking-tight">Esse endereço não existe no bairro</h1>
        <p className="text-muted-fg max-w-sm mx-auto">O link pode estar incompleto ou a página saiu do ar.</p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="h-11 px-5 rounded-lg bg-primary font-semibold text-white flex items-center hover:bg-primary-hover"
        >
          Voltar ao início
        </Link>
        <Link href="/feed/" className="h-11 px-5 rounded-lg font-semibold text-primary flex items-center hover:underline underline-offset-4">
          Ir para o feed
        </Link>
      </div>
    </div>
  );
}
