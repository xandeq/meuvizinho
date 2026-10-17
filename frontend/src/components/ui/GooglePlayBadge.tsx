const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.meuvizinho.app";

/** Selo da loja para fundos claros (páginas públicas de post/anúncio compartilhados no WhatsApp). */
export default function GooglePlayBadge() {
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-12 items-center gap-3 rounded-lg bg-fg pl-3.5 pr-5 text-bg transition-transform duration-200 hover:scale-[1.03]"
    >
      <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#34A853" d="M3.6 2.2 13.4 12 3.6 21.8a1.6 1.6 0 0 1-.6-1.3V3.5c0-.5.2-1 .6-1.3Z" />
        <path fill="#FBBC04" d="m16.7 15.3-3.3-3.3 3.3-3.3 3.7 2.1c1.1.6 1.1 1.8 0 2.4l-3.7 2.1Z" />
        <path fill="#4285F4" d="M16.7 15.3 13.4 12l-9.8 9.8c.4.4 1 .4 1.6.1l11.5-6.6Z" />
        <path fill="#EA4335" d="M16.7 8.7 5.2 2.1c-.6-.3-1.2-.3-1.6.1L13.4 12l3.3-3.3Z" />
      </svg>
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[10px] font-semibold opacity-80">Disponível no</span>
        <span className="text-sm font-bold">Google Play</span>
      </span>
    </a>
  );
}
