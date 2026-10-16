"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/lib/auth";

const PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.meuvizinho.app";

/* ─── Inline SVG icons — flat, 24×24, no dependency ──────────── */

function IconGooglePlay() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#34A853" d="M3.6 2.2 13.4 12 3.6 21.8a1.6 1.6 0 0 1-.6-1.3V3.5c0-.5.2-1 .6-1.3Z" />
      <path fill="#FBBC04" d="m16.7 15.3-3.3-3.3 3.3-3.3 3.7 2.1c1.1.6 1.1 1.8 0 2.4l-3.7 2.1Z" />
      <path fill="#4285F4" d="M16.7 15.3 13.4 12l-9.8 9.8c.4.4 1 .4 1.6.1l11.5-6.6Z" />
      <path fill="#EA4335" d="M16.7 8.7 5.2 2.1c-.6-.3-1.2-.3-1.6.1L13.4 12l3.3-3.3Z" />
    </svg>
  );
}

/* Botão de loja: mesmo peso visual de um CTA secundário, nunca imagem oficial esticada. */
function GooglePlayButton({ tone = "dark" }: { tone?: "dark" | "light" }) {
  const toneCls =
    tone === "dark"
      ? "bg-black/15 text-white border-white/30 hover:bg-black/25 hover:border-white/50"
      : "bg-white text-slate-900 border-white hover:scale-[1.03]";
  return (
    <a
      href={PLAY_STORE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className={`h-14 pl-4 pr-6 rounded-lg border-2 flex items-center gap-3 transition-all duration-200 ${toneCls}`}
    >
      <IconGooglePlay />
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[11px] font-semibold">Disponível no</span>
        <span className="text-base font-bold">Google Play</span>
      </span>
    </a>
  );
}

/* Ilustração do app em HTML (mesmo visual do app: Outfit, cards, selo verde).
   É ilustração de produto, não print nem depoimento de usuário real. */
function MiniPost({
  initials, name, tag, tagCls, time, body,
}: { initials: string; name: string; tag: string; tagCls: string; time: string; body: string }) {
  return (
    <div className="rounded-2xl bg-white p-3.5 text-slate-900" style={{ boxShadow: "0 1px 2px rgba(15,23,42,0.06)" }}>
      <div className="flex items-center gap-2.5">
        <span className="w-9 h-9 rounded-full bg-[#2563EB] text-white text-xs font-bold flex items-center justify-center">
          {initials}
        </span>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[13px] font-bold leading-tight">
            {name}
            <svg width="13" height="13" viewBox="0 0 24 24" aria-label="verificado">
              <circle cx="12" cy="12" r="11" fill="#059669" />
              <path d="M7 12.5l3.2 3.2L17 9" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </p>
          <p className="text-[11px] font-medium text-slate-500">
            <span className={tagCls}>{tag}</span> · {time}
          </p>
        </div>
      </div>
      <p className="mt-2 text-[12.5px] leading-snug text-slate-800">{body}</p>
    </div>
  );
}

function HeroPhone() {
  return (
    <div className="relative mx-auto w-[260px] sm:w-[280px]" aria-hidden="true">
      <div
        className="rounded-[2.4rem] bg-slate-950 p-2.5 ring-1 ring-white/15"
        style={{ boxShadow: "0 40px 80px -24px rgba(2,6,23,0.7)" }}
      >
        <div className="rounded-[2rem] bg-[#F8FAFC] overflow-hidden">
          <div className="flex items-center justify-between px-5 pt-3 text-[10px] font-semibold text-slate-700">
            <span>9:41</span>
            <span className="w-14 h-4 rounded-full bg-slate-950" />
            <span>100%</span>
          </div>
          <div className="px-4 pt-3 pb-2">
            <p className="flex items-center gap-1 text-[11px] font-semibold text-[#2563EB]">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="#2563EB"><path d="M12 2a7 7 0 00-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 00-7-7zm0 9.5A2.5 2.5 0 1112 6a2.5 2.5 0 010 5.5z" /></svg>
              Praia da Costa
            </p>
            <p className="text-[22px] font-extrabold tracking-tight text-slate-900">Bairro</p>
          </div>
          <div className="space-y-2.5 px-3 pb-6">
            <MiniPost
              initials="PL" name="Patrícia Lima" tag="Pergunta" tagCls="text-[#B45309]" time="12 min"
              body="Alguém indica um eletricista de confiança aqui perto? Preciso pra amanhã."
            />
            <MiniPost
              initials="MV" name="Marcos Vieira" tag="Alerta" tagCls="text-[#DC2626]" time="1 h"
              body="Portão da garagem do 210 ficou aberto a noite toda. Já avisei a portaria."
            />
            <MiniPost
              initials="JR" name="Júlia Rocha" tag="Dica" tagCls="text-[#2563EB]" time="3 h"
              body="Feira orgânica volta sábado na praça, 7h às 12h."
            />
          </div>
        </div>
      </div>

      {/* Cartões flutuantes: o que o condomínio recebe, sobreposto ao celular */}
      <div
        className="hidden sm:block absolute -right-44 top-20 w-48 rounded-2xl bg-white p-3 text-slate-900 rotate-2"
        style={{ boxShadow: "0 18px 40px -12px rgba(2,6,23,0.45)" }}
      >
        <p className="flex items-center gap-1.5 text-[11px] font-bold text-[#2563EB]">
          <IconMegaphone /> Comunicado do síndico
        </p>
        <p className="mt-1 text-[12px] font-semibold leading-snug">Manutenção do elevador quinta, das 9h às 12h.</p>
      </div>
      <div
        className="hidden sm:block absolute -right-36 bottom-24 w-44 rounded-2xl bg-white p-3 text-slate-900 -rotate-2"
        style={{ boxShadow: "0 18px 40px -12px rgba(2,6,23,0.45)" }}
      >
        <p className="text-[11px] font-bold text-slate-500">Reserva confirmada</p>
        <p className="mt-0.5 text-[12.5px] font-bold">Salão de festas</p>
        <p className="text-[11px] font-medium text-slate-600">Sáb, 19:00 às 23:00</p>
      </div>
    </div>
  );
}

function IconHome() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>
    </svg>
  );
}
function IconShoppingBag() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/>
    </svg>
  );
}
function IconChat() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  );
}
function IconMapPin() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
    </svg>
  );
}
function IconCheck() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  );
}
function IconWrench() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4 2.5-2.5z" />
    </svg>
  );
}
function IconBadgeCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      <polyline points="9 12 11 14 15 10"/>
    </svg>
  );
}
function IconShield() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  );
}
function IconBuilding() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>
    </svg>
  );
}
function IconMegaphone() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 11v2a1 1 0 001 1h3l5 4V6L7 10H4a1 1 0 00-1 1z"/><path d="M16 8a5 5 0 010 8"/><path d="M19 5a9 9 0 010 14"/>
    </svg>
  );
}
function IconCalendar() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
    </svg>
  );
}
function IconUserCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="8.5" cy="7" r="4"/><polyline points="17 11 19 13 23 9"/>
    </svg>
  );
}
function IconPin() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="17" x2="12" y2="22"/><path d="M5 17h14v-1.76a2 2 0 00-1.11-1.79l-1.78-.9A2 2 0 0115 10.76V6h1a2 2 0 000-4H8a2 2 0 000 4h1v4.76a2 2 0 01-1.11 1.79l-1.78.9A2 2 0 005 15.24z"/>
    </svg>
  );
}
function IconArrowRight() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
    </svg>
  );
}

/* ─── Sub-components ─────────────────────────────────────────── */

function FeatureIcon({ children, bg }: { children: React.ReactNode; bg: string }) {
  return (
    <div className={["w-12 h-12 rounded-xl flex items-center justify-center shrink-0", bg].join(" ")}>
      {children}
    </div>
  );
}

function StepBadge({ n }: { n: number }) {
  return (
    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shrink-0">
      <span className="text-white font-extrabold text-lg leading-none">{n}</span>
    </div>
  );
}

const LISTING_ART: Record<string, React.ReactNode> = {
  bike: (
    <>
      <circle cx="16" cy="44" r="12" />
      <circle cx="56" cy="44" r="12" />
      <path d="M16 44l14-22h16l10 22M30 22l12 22h-26M42 16h8M28 16h6" />
    </>
  ),
  desk: (
    <>
      <path d="M8 24h56v6H8zM14 30v26M58 30v26M40 30v14h18" />
      <path d="M24 24V14h14v10M31 14v-4" />
    </>
  ),
  guitar: (
    <>
      <path d="M44 12l10-6 4 4-6 10" />
      <path d="M50 16L34 32" />
      <path d="M34 32c-4-4-12-3-15 1-3 3-1 7-4 10-4 4-4 10 0 14s10 4 14 0c3-3 7-1 10-4 4-3 5-11 1-15z" />
      <circle cx="26" cy="44" r="4" />
    </>
  ),
};

/** Card de exemplo do Mercado: ilustração por categoria (não é foto de anúncio real). */
function FakeListingCard({
  title,
  price,
  category,
  verified,
  art,
}: {
  title: string;
  price: string;
  category: string;
  verified: boolean;
  art: keyof typeof LISTING_ART;
}) {
  return (
    <div className="bg-bg rounded-2xl p-5 flex flex-col gap-3">
      <div className="w-full h-32 rounded-xl bg-gradient-to-br from-amber-100 to-amber-50 flex items-center justify-center" aria-hidden>
        <svg width="72" height="64" viewBox="0 0 72 64" fill="none" stroke="#B45309" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
          {LISTING_ART[art]}
        </svg>
      </div>
      <div>
        <span className="inline-block bg-amber-100 text-amber-700 text-xs font-semibold rounded-md px-2 py-0.5 mb-1">
          {category}
        </span>
        <p className="font-bold text-fg text-sm leading-snug">{title}</p>
      </div>
      <div className="flex items-center justify-between mt-auto">
        <p className="text-2xl font-extrabold text-fg tracking-tight">{price}</p>
        {verified && (
          <span className="flex items-center gap-1 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded-full px-2.5 py-1">
            <span className="text-emerald-600"><IconCheck /></span>
            Verificado
          </span>
        )}
      </div>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────── */

export default function LandingPage() {
  const router = useRouter();

  /** Redirect authenticated users to the feed without flickering the marketing page */
  useEffect(() => {
    const t = setTimeout(() => {
      if (useAuthStore.getState().isAuthenticated) {
        router.replace("/feed/");
      }
    }, 0);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col font-sans">

      {/* ══════════════════════════════════════════════════════
          HERO — dark slate-900, poster-scale typography
      ══════════════════════════════════════════════════════ */}
      <section className="relative bg-slate-900 text-white overflow-hidden">

        {/* Decorative circles — low opacity, partially off-screen */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-[36rem] h-[36rem] rounded-full bg-primary opacity-[0.12] -top-40 -right-40" />
          {/* Era âmbar a 12% sobre o azul-marinho: virava mancha marrom atrás do "Já tem conta?". */}
          <div className="absolute w-80 h-80 rounded-full bg-primary opacity-[0.08] -bottom-40 -left-32" />
          <div className="absolute w-40 h-40 rotate-45 rounded-lg bg-secondary opacity-[0.08] bottom-1/3 right-1/4" />
        </div>

        {/* Nav */}
        <header className="relative z-10 px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-lg sm:text-xl font-extrabold text-white whitespace-nowrap">
            <Image src="/brand/logo-icon.png" alt="Meu Vizinho" width={32} height={32} priority />
            Meu Vizinho
          </Link>
          <nav className="flex items-center gap-3 sm:gap-4 text-sm font-semibold">
            <a
              href="#sindicos"
              className="hidden sm:inline text-white/70 hover:text-white transition-colors"
            >
              Para síndicos
            </a>
            <Link
              href="/login/"
              className="text-white/70 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register/"
              className="h-10 px-4 sm:px-5 rounded-lg bg-primary text-white hover:bg-primary-hover whitespace-nowrap
                         flex items-center transition-all duration-200 hover:scale-[1.03]"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-24 md:pt-20 md:pb-28
                        grid lg:grid-cols-[minmax(0,1fr)_420px] gap-14 items-center">
          <div>
          {/* Eyebrow */}
          <p className="inline-flex items-center gap-2 bg-white/10 text-white/80 rounded-full px-4 py-1.5
                        text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
            Bairros e condomínios · Vila Velha, ES
          </p>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-extrabold
                         leading-[0.95] tracking-tight text-white max-w-3xl">
            Seu bairro,{" "}
            <span className="text-primary">conectado</span>{" "}
            de verdade.
          </h1>

          {/* Sub */}
          <p className="mt-8 text-lg md:text-xl text-white/60 max-w-xl leading-relaxed font-medium">
            Feed do bairro, marketplace entre vizinhos, alertas de segurança e
            ferramentas para síndicos. Tudo com endereço comprovado, sem algoritmo e sem anúncio.
          </p>

          {/* CTAs */}
          <div className="mt-10 flex flex-wrap items-center gap-4">
            <Link
              href="/register/"
              className="h-14 px-8 rounded-lg bg-primary text-white font-semibold text-base
                         flex items-center gap-2 transition-all duration-200 hover:bg-primary-hover hover:scale-[1.03]"
            >
              Criar conta grátis
              <IconArrowRight />
            </Link>
            <GooglePlayButton tone="dark" />
          </div>
          <p className="mt-5 text-sm text-white/50 font-medium">
            Já tem conta?{" "}
            <Link href="/login/" className="text-white/80 underline underline-offset-4 hover:text-white">
              Entrar
            </Link>
          </p>
          </div>

          {/* Ilustração do app com cartões sobrepostos (profundidade, sem print de dado de teste) */}
          <div className="relative sm:-translate-x-16 lg:-translate-x-20">
            <HeroPhone />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SOCIAL PROOF STRIP — white
      ══════════════════════════════════════════════════════ */}
      <section className="bg-bg border-b-2 border-border py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {[
            { n: "100%", label: "de quem publica tem endereço comprovado" },
            { n: "Vila Velha", label: "primeira cidade do piloto" },
            { n: "0", label: "anúncios patrocinados" },
          ].map(({ n, label }) => (
            <div key={label} className="text-center">
              <p className="text-3xl font-extrabold text-primary">{n}</p>
              <p className="text-sm text-muted-fg font-medium">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FEATURES — blue-50 tinted section
      ══════════════════════════════════════════════════════ */}
      <section className="bg-primary/5 py-20 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            O que você vai encontrar
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-fg tracking-tight mb-14 max-w-2xl">
            Tudo que seu bairro precisa, num só lugar.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-5">
            {/* Feed: o coração do produto, ocupa o maior bloco */}
            <article className="sm:col-span-2 lg:col-span-4 lg:row-span-2 bg-bg rounded-2xl p-7 md:p-9 flex flex-col">
              <FeatureIcon bg="bg-primary-light text-primary">
                <IconHome />
              </FeatureIcon>
              <h3 className="mt-5 text-2xl md:text-3xl font-extrabold text-fg tracking-tight">Feed do bairro</h3>
              <p className="mt-2 text-base text-muted-fg leading-relaxed max-w-md">
                Avisos, dicas, perguntas e eventos de quem mora perto. Ordem cronológica, sem algoritmo
                decidindo o que você vê.
              </p>
              <div className="mt-auto pt-8 grid sm:grid-cols-2 gap-3 max-w-xl" aria-hidden="true">
                <MiniPost
                  initials="RS" name="Renata Souza" tag="Dica" tagCls="text-[#2563EB]" time="20 min"
                  body="A padaria da esquina agora abre às 6h aos domingos."
                />
                <MiniPost
                  initials="AC" name="André Costa" tag="Evento" tagCls="text-[#2563EB]" time="2 h"
                  body="Mutirão de limpeza da praça no sábado, 8h. Levo luvas pra quem precisar."
                />
              </div>
            </article>

            {/* Alertas */}
            <article className="lg:col-span-2 bg-bg rounded-2xl p-7 flex flex-col">
              <FeatureIcon bg="bg-danger-light text-danger">
                <IconShield />
              </FeatureIcon>
              <h3 className="mt-5 text-xl font-extrabold text-fg">Alertas de segurança</h3>
              <p className="mt-2 text-sm text-muted-fg leading-relaxed">
                Avise o bairro na hora. Vizinhos confirmam o alerta e todo mundo fica sabendo.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {["Furto", "Pessoa suspeita", "Incêndio", "Acidente"].map((k) => (
                  <span key={k} className="text-xs font-semibold rounded-full px-3 py-1 bg-danger-light text-red-700 dark:text-red-300">
                    {k}
                  </span>
                ))}
              </div>
            </article>

            {/* Condomínios */}
            <article className="lg:col-span-2 bg-bg rounded-2xl p-7 flex flex-col">
              <FeatureIcon bg="bg-primary-light text-primary">
                <IconBuilding />
              </FeatureIcon>
              <h3 className="mt-5 text-xl font-extrabold text-fg">Condomínios</h3>
              <p className="mt-2 text-sm text-muted-fg leading-relaxed">
                Comunicados, ocorrências com resposta do síndico e reserva de áreas comuns.
              </p>
              <a
                href="#sindicos"
                className="mt-auto pt-5 inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline underline-offset-4"
              >
                Ferramentas para síndicos <IconArrowRight />
              </a>
            </article>

            {/* Linha de apoio: três recursos com o mesmo peso, mas sem virar card genérico */}
            <article className="lg:col-span-2 bg-bg rounded-2xl p-6 flex gap-4 items-start">
              <FeatureIcon bg="bg-accent-light text-accent">
                <IconShoppingBag />
              </FeatureIcon>
              <div>
                <h3 className="text-lg font-extrabold text-fg">Mercado local</h3>
                <p className="mt-1 text-sm text-muted-fg leading-relaxed">
                  Compre, venda e doe com vizinhos verificados. Você sabe com quem está negociando.
                </p>
              </div>
            </article>
            <article className="lg:col-span-2 bg-bg rounded-2xl p-6 flex gap-4 items-start">
              <FeatureIcon bg="bg-primary-light text-primary">
                <IconChat />
              </FeatureIcon>
              <div>
                <h3 className="text-lg font-extrabold text-fg">Chat privado</h3>
                <p className="mt-1 text-sm text-muted-fg leading-relaxed">
                  Converse direto com o vizinho, sem expor seu telefone.
                </p>
              </div>
            </article>
            <article className="sm:col-span-2 lg:col-span-2 bg-bg rounded-2xl p-6 flex gap-4 items-start">
              <FeatureIcon bg="bg-[#25D366]/15 text-[#1DA851]">
                <IconUsers />
              </FeatureIcon>
              <div>
                <h3 className="text-lg font-extrabold text-fg">Grupos de WhatsApp</h3>
                <p className="mt-1 text-sm text-muted-fg leading-relaxed">
                  Diretório verificado do bairro: link ativo e admin identificado. Zero grupo fantasma.
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          WHATSAPP x MEU VIZINHO — o argumento do mercado (caos do grupo),
          sem atacar o WhatsApp: ele segue para a conversa.
      ══════════════════════════════════════════════════════ */}
      <section className="bg-bg py-20 px-6">
        <div className="max-w-6xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Para prédios e bairros
          </p>
          <h2 className="text-4xl md:text-5xl font-extrabold text-fg tracking-tight max-w-3xl">
            WhatsApp é para conversa. O que importa fica aqui.
          </h2>
          <p className="mt-5 text-lg text-muted-fg max-w-2xl leading-relaxed">
            O grupo do prédio continua existindo. A diferença é que aviso oficial, reserva e alerta
            não se perdem no meio de cem mensagens de bom dia.
          </p>

          <div className="mt-12 grid md:grid-cols-2 gap-5">
            <div className="rounded-2xl bg-muted p-7">
              <p className="text-sm font-bold text-muted-fg">Só no grupo de WhatsApp</p>
              <ul className="mt-5 space-y-4">
                {[
                  "O aviso do síndico some em meia hora de conversa.",
                  "Reserva do salão combinada no grito, e dá conflito.",
                  "Pedido de manutenção some no grupo e ninguém sabe se foi resolvido.",
                  "Ninguém sabe se quem entrou no grupo mora mesmo ali.",
                  "Alerta de segurança vira boato sem confirmação.",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] text-fg/80 leading-snug">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-border text-muted-fg flex items-center justify-center shrink-0" aria-hidden>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl bg-primary-light p-7 ring-1 ring-primary/20">
              <p className="text-sm font-bold text-primary">Com o Meu Vizinho</p>
              <ul className="mt-5 space-y-4">
                {[
                  "Comunicado do síndico fixado, com data de validade.",
                  "Reserva com os horários ocupados à vista e aprovação do síndico.",
                  "Ocorrência com status e resposta do síndico, do aberto ao resolvido.",
                  "Todo vizinho com endereço comprovado e selo de verificado.",
                  "Alerta confirmado por outros vizinhos, com tipo e horário.",
                ].map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] text-fg leading-snug font-medium">
                    <span className="mt-0.5 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center shrink-0" aria-hidden>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
                    </span>
                    {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          WHATSAPP DIRECTORY — slate-900, green accent
      ══════════════════════════════════════════════════════ */}
      <section className="bg-slate-900 py-20 px-6 text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-green-400 mb-3">
              Diferencial exclusivo
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-6">
              O diretório de grupos WhatsApp que o bairro precisava.
            </h2>
            <p className="text-white/60 text-lg leading-relaxed mb-10 max-w-lg">
              Chega de buscar grupos perdidos. Aqui você encontra os grupos verificados do seu bairro, com link ativo, admin identificado e moderação real.
            </p>
            <ul className="space-y-5">
              {[
                "Grupos por bairro com link verificado e admin identificado",
                "Perfis de condomínio com síndico reivindicável",
                "@meuvizinho como co-admin permanente: sem grupo de golpe",
              ].map((item) => (
                <li key={item} className="flex items-start gap-4">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <IconCheck />
                  </span>
                  <p className="text-white/80 font-medium leading-relaxed">{item}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Visual — WhatsApp directory mockup */}
          <div className="flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-white/70 mb-1">
              Exemplo de como fica o diretório
            </p>
            {[
              { name: "Moradores do bairro", members: "Link verificado · admin identificado", tag: "Bairro" },
              { name: "Pets da vizinhança", members: "Link verificado", tag: "Pets" },
              { name: "Corrida de domingo", members: "Link verificado", tag: "Esporte" },
              { name: "Condomínio · avisos do síndico", members: "Síndico verificado", tag: "Condomínio" },
            ].map(({ name, members, tag }) => (
              <div
                key={name}
                className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-green-600/80 flex items-center justify-center shrink-0">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="white" aria-hidden>
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-white text-sm truncate">{name}</p>
                  <p className="text-xs text-white/70 mt-0.5">{members}</p>
                </div>
                <span className="text-xs bg-white/10 text-white/60 rounded-full px-2.5 py-1 font-medium shrink-0">
                  {tag}
                </span>
              </div>
            ))}
            <Link
              href="/register/"
              className="mt-2 h-12 rounded-xl bg-primary text-white font-semibold text-sm
                         flex items-center justify-center gap-2 transition-all duration-200 hover:bg-primary-hover"
            >
              Ver diretório completo
              <IconArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SÍNDICOS — slate-100, condo management showcase
      ══════════════════════════════════════════════════════ */}
      <section id="sindicos" className="bg-muted py-20 px-6 scroll-mt-4">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Visual — condo page mockup */}
          <div className="order-2 lg:order-1 bg-card rounded-2xl border border-border p-6 flex flex-col gap-5">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-fg -mb-1">
              Exemplo de página do condomínio
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center text-white shrink-0">
                <IconBuilding />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-extrabold text-fg leading-tight">Cond. Marina Beach</p>
                <p className="text-xs text-muted-fg">Praia da Costa · 48 unidades</p>
              </div>
              <span className="text-xs font-semibold bg-secondary-light text-secondary rounded-full px-2.5 py-1 shrink-0">
                Com síndico
              </span>
            </div>

            <div className="rounded-xl border-2 border-primary/30 bg-primary-light p-4">
              <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary mb-1.5">
                <IconPin /> Comunicado fixado
              </p>
              <p className="font-bold text-fg text-sm">Manutenção do elevador social</p>
              <p className="text-sm text-muted-fg mt-0.5">Quinta-feira, das 9h às 12h. Use o elevador de serviço.</p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-fg mb-2">Reservas da semana</p>
              <ul className="flex flex-col gap-2">
                {[
                  { area: "Salão de festas", when: "Sáb 18/10 · 19h", status: "Aprovada", cls: "bg-secondary-light text-secondary" },
                  { area: "Churrasqueira", when: "Dom 19/10 · 12h", status: "Aguardando", cls: "bg-accent-light text-accent" },
                ].map(({ area, when, status, cls }) => (
                  <li key={area} className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="font-semibold text-fg text-sm truncate">{area}</p>
                      <p className="text-xs text-muted-fg">{when}</p>
                    </div>
                    <span className={["text-xs font-semibold rounded-full px-2.5 py-1 shrink-0", cls].join(" ")}>{status}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-lg border border-border px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-fg">Ocorrência · Manutenção</p>
                <p className="text-sm font-semibold text-fg">Lâmpada queimada no hall</p>
              </div>
              <span className="text-xs font-semibold bg-primary-light text-primary rounded-full px-2.5 py-1 shrink-0 self-start sm:self-auto">Em andamento</span>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2.5">
              <p className="text-sm text-fg"><span className="font-semibold">Apto 302</span> pediu vínculo de morador</p>
              <span className="text-xs font-semibold text-primary shrink-0">Aprovar</span>
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
              Para síndicos
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-fg tracking-tight mb-6">
              O condomínio inteiro num só lugar.
            </h2>
            <p className="text-lg text-muted-fg leading-relaxed mb-10 max-w-lg">
              Chega de aviso perdido no grupo do WhatsApp e reserva anotada no caderno da portaria.
              O síndico assume a página do prédio e organiza a rotina com moradores verificados.
            </p>
            <ul className="space-y-5">
              {[
                { icon: <IconMegaphone />, title: "Comunicados oficiais", text: "Avisos do síndico com destaque fixo no topo. Ninguém diz que não viu." },
                { icon: <IconWrench />, title: "Ocorrências com resposta", text: "O morador abre o chamado, o síndico responde e os dois acompanham até resolver." },
                { icon: <IconCalendar />, title: "Reserva de áreas comuns", text: "Salão, churrasqueira e quadra com agenda de horários e aprovação do síndico." },
                { icon: <IconUserCheck />, title: "Moradores vinculados", text: "Cada morador pede vínculo com a unidade e o síndico aprova, recusa ou revoga." },
                { icon: <IconBadgeCheck />, title: "Síndico verificado", text: "A reivindicação da página passa pela nossa equipe antes de ser liberada." },
              ].map(({ icon, title, text }) => (
                <li key={title} className="flex items-start gap-4">
                  <span className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    {icon}
                  </span>
                  <div>
                    <p className="font-bold text-fg">{title}</p>
                    <p className="text-muted-fg leading-relaxed">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
            <Link
              href="/register/"
              className="mt-10 h-12 px-6 rounded-lg bg-primary text-white font-semibold text-sm w-fit
                         flex items-center gap-2 transition-all duration-200 hover:bg-primary-hover hover:scale-[1.03]"
            >
              Cadastrar meu condomínio
              <IconArrowRight />
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          VERIFICATION — white, trust-focused
      ══════════════════════════════════════════════════════ */}
      <section className="bg-bg py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">
              Vizinhos verificados
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-fg tracking-tight mb-6">
              Sua identidade protege toda a comunidade.
            </h2>
            <p className="text-lg text-muted-fg leading-relaxed mb-10 max-w-lg">
              Todos os vizinhos passam por verificação de CEP e comprovante de residência.
              Isso cria um ambiente de confiança que redes sociais convencionais não conseguem oferecer.
            </p>

            {/* Steps */}
            <ol className="space-y-5">
              {[
                { step: 1, text: "Informe seu CEP: identificamos seu bairro automaticamente" },
                { step: 2, text: "Envie uma foto do seu comprovante de residência" },
                { step: 3, text: "Nosso time valida em até 24h e você recebe um e-mail de confirmação" },
                { step: 4, text: "Acesso completo ao feed, marketplace, grupos e ao seu condomínio" },
              ].map(({ step, text }) => (
                <li key={step} className="flex items-start gap-4">
                  <StepBadge n={step} />
                  <p className="text-fg font-medium leading-relaxed pt-2">{text}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Visual — verified badge hero */}
          <div className="relative flex items-center justify-center">
            {/* Decorative background */}
            <div aria-hidden className="absolute w-72 h-72 rounded-full bg-emerald-50 opacity-80" />
            <div aria-hidden className="absolute w-40 h-40 rounded-full bg-primary/5 opacity-60 -top-4 -right-4" />

            {/* Badge showcase card */}
            <div className="relative bg-card rounded-2xl p-8 max-w-xs w-full border border-border/50 shadow-md">
              {/* Fake avatar + name */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-white font-extrabold text-xl">
                  M
                </div>
                <div>
                  <p className="font-extrabold text-fg">Maria S.</p>
                  <p className="text-sm text-muted-fg">Vila Velha, ES</p>
                </div>
              </div>

              {/* Verified badge — the signature element */}
              <div className="flex flex-col gap-3">
                <span className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700
                                  rounded-full px-4 py-2 text-sm font-semibold w-fit">
                  <span className="text-emerald-600"><IconBadgeCheck /></span>
                  Vizinha verificada
                </span>
                <span className="inline-flex items-center gap-2 bg-primary-light text-primary-hover
                                  rounded-full px-4 py-2 text-sm font-semibold w-fit">
                  <span className="text-primary"><IconMapPin /></span>
                  Praia da Costa · 3 anos no bairro
                </span>
              </div>

              <div className="mt-6 pt-6 border-t-2 border-border">
                <p className="text-xs text-muted-fg font-medium">
                  Verificada há 3 meses
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          MARKETPLACE PREVIEW — amber-50 tinted
      ══════════════════════════════════════════════════════ */}
      <section className="bg-accent-light py-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-accent-hover mb-3">
                Marketplace
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-fg tracking-tight">
                Compre e venda com<br className="hidden sm:block" />{" "}quem você conhece.
              </h2>
            </div>
            <Link
              href="/register/"
              className="h-12 px-6 rounded-lg bg-amber-700 text-white font-semibold text-sm shrink-0
                         flex items-center gap-2 transition-all duration-200 hover:bg-amber-800 hover:scale-[1.03] w-fit"
            >
              Ver marketplace
              <IconArrowRight />
            </Link>
          </div>

          {/* Exemplos do Mercado (ilustrativos) */}
          <p className="text-xs font-semibold uppercase tracking-widest text-accent-hover mb-3">Exemplo de anúncios</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FakeListingCard title="Bicicleta aro 26 conservada" price="R$&nbsp;380" category="Esporte" art="bike" verified />
            <FakeListingCard title="Mesa de escritório cor carvalho" price="R$&nbsp;250" category="Móveis" art="desk" verified />
            <FakeListingCard title="Aulas de violão para crianças" price="R$&nbsp;80/aula" category="Serviços" art="guitar" verified />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          LOCAL TRUST — emerald-50, feature list
      ══════════════════════════════════════════════════════ */}
      <section className="bg-secondary-light py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Checklist */}
          <ul className="space-y-4">
            {[
              "Sem algoritmo: veja tudo do seu bairro em ordem cronológica",
              "Sem anúncios patrocinados. Nunca.",
              "Seu endereço exato nunca aparece: no mapa a posição é aproximada",
              "Código público no GitHub, aberto para auditoria",
              "Você pode exportar ou apagar sua conta a qualquer momento",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-full bg-secondary text-white flex items-center justify-center shrink-0 mt-0.5">
                  <IconCheck />
                </span>
                <span className="text-fg font-medium leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>

          {/* Copy */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-secondary mb-3">
              Nossos princípios
            </p>
            <h2 className="text-4xl md:text-5xl font-extrabold text-fg tracking-tight mb-6">
              Feito para o bairro,<br className="hidden sm:block" />{" "}não para o anunciante.
            </h2>
            <p className="text-lg text-muted-fg leading-relaxed">
              O Meu Vizinho existe para conectar vizinhos reais, não para vender sua atenção.
              Por isso não há anúncios, algoritmo de engajamento ou recomendação de conteúdo externo.
            </p>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          CTA BLOCK — blue-600 full-bleed
      ══════════════════════════════════════════════════════ */}
      <section className="relative bg-primary overflow-hidden py-24 px-6 text-white">
        {/* Decoration */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute w-96 h-96 rounded-full bg-white/5 -top-32 -right-20" />
          <div className="absolute w-60 h-60 rotate-45 rounded-lg bg-white/5 -bottom-16 left-20" />
        </div>

        <div className="relative z-10 max-w-3xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-6">
            Pronto para conectar com seus vizinhos?
          </h2>
          <p className="text-white/70 text-lg mb-10 leading-relaxed">
            Junte-se aos primeiros vizinhos verificados do piloto em Vila Velha.
            É grátis, rápido e sem burocracia.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/register/"
              className="h-14 px-10 rounded-lg bg-white text-primary font-extrabold text-lg
                         flex items-center gap-2 transition-all duration-200 hover:scale-[1.03]"
            >
              Criar minha conta
              <IconArrowRight />
            </Link>
            <GooglePlayButton tone="dark" />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER — dark slate-900
      ══════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <Image src="/brand/logo-icon.png" alt="Meu Vizinho" width={28} height={28} />
            Meu Vizinho
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-white/60">
            <a href="#sindicos" className="hover:text-white transition-colors">
              Para síndicos
            </a>
            <a href={PLAY_STORE_URL} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              App Android
            </a>
            <Link href="/privacy-policy/" className="hover:text-white transition-colors">
              Política de Privacidade
            </Link>
            <Link href="/login/" className="hover:text-white transition-colors">
              Entrar
            </Link>
            <Link href="/register/" className="hover:text-white transition-colors">
              Criar conta
            </Link>
          </nav>

          <p className="text-sm text-white/70 font-medium">
            © {new Date().getFullYear()} Meu Vizinho
          </p>
        </div>
      </footer>

    </div>
  );
}
