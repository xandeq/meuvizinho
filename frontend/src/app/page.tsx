"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuthStore } from "@/lib/auth";

/* ─── Inline SVG icons — flat, 24×24, no dependency ──────────── */

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
function IconBadgeCheck() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      <polyline points="9 12 11 14 15 10"/>
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
    <div className={["w-14 h-14 rounded-full flex items-center justify-center shrink-0", bg].join(" ")}>
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

/** Fake listing card — demonstrates the amber-tinted marketplace aesthetic */
function FakeListingCard({
  title,
  price,
  category,
  verified,
}: {
  title: string;
  price: string;
  category: string;
  verified: boolean;
}) {
  return (
    <div className="bg-bg rounded-lg p-5 flex flex-col gap-3">
      {/* Colour-blocked image placeholder */}
      <div className="w-full h-32 rounded-md bg-amber-100 flex items-center justify-center">
        <div aria-hidden className="w-12 h-12 bg-amber-200 rounded-full" />
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
          <div className="absolute w-72 h-72 rounded-full bg-accent opacity-[0.12] -bottom-20 left-10" />
          <div className="absolute w-40 h-40 rotate-45 rounded-lg bg-secondary opacity-[0.08] bottom-1/3 right-1/4" />
        </div>

        {/* Nav */}
        <header className="relative z-10 px-6 py-5 max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-xl font-extrabold text-white">
            <Image src="/brand/logo-icon.png" alt="BairroNow" width={32} height={32} priority />
            BairroNow
          </Link>
          <nav className="flex items-center gap-4 text-sm font-semibold">
            <Link
              href="/login/"
              className="text-white/70 hover:text-white transition-colors"
            >
              Entrar
            </Link>
            <Link
              href="/register/"
              className="h-10 px-5 rounded-lg bg-primary text-white hover:bg-primary-hover
                         flex items-center transition-all duration-200 hover:scale-[1.03]"
            >
              Criar conta
            </Link>
          </nav>
        </header>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16 pb-28 md:pt-24 md:pb-36">
          {/* Eyebrow */}
          <p className="inline-flex items-center gap-2 bg-white/10 text-white/80 rounded-full px-4 py-1.5
                        text-xs font-semibold uppercase tracking-widest mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary inline-block" />
            Rede social de bairro · Vila Velha, ES
          </p>

          {/* Headline */}
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold
                         leading-[0.95] tracking-tight text-white max-w-4xl">
            Seu bairro,{" "}
            <span className="text-primary">conectado</span>{" "}
            de verdade.
          </h1>

          {/* Sub */}
          <p className="mt-8 text-lg md:text-xl text-white/60 max-w-xl leading-relaxed font-medium">
            Feed local, marketplace entre vizinhos e grupos de interesse —
            tudo com identidade verificada. Sem algoritmo, sem anúncio, sem drama.
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
            <Link
              href="/login/"
              className="h-14 px-8 rounded-lg border-4 border-white/30 text-white font-semibold text-base
                         flex items-center gap-2 transition-all duration-200 hover:border-white hover:scale-[1.03]"
            >
              Já sou vizinho
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          SOCIAL PROOF STRIP — white
      ══════════════════════════════════════════════════════ */}
      <section className="bg-bg border-b-2 border-border py-6 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {[
            { n: "100%", label: "identidades verificadas" },
            { n: "3", label: "bairros no piloto" },
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Feed */}
            <div className="group bg-bg rounded-lg p-6 transition-all duration-200 hover:scale-[1.02] cursor-default">
              <FeatureIcon bg="bg-primary/10 text-primary">
                <IconHome />
              </FeatureIcon>
              <h3 className="mt-5 text-xl font-extrabold text-fg">Feed do Bairro</h3>
              <p className="mt-2 text-sm text-muted-fg leading-relaxed">
                Fique por dentro do que acontece perto de você em tempo real. Posts, avisos e eventos do bairro.
              </p>
            </div>

            {/* Marketplace */}
            <div className="group bg-bg rounded-lg p-6 transition-all duration-200 hover:scale-[1.02] cursor-default">
              <FeatureIcon bg="bg-amber-100 text-amber-600">
                <IconShoppingBag />
              </FeatureIcon>
              <h3 className="mt-5 text-xl font-extrabold text-fg">Marketplace Local</h3>
              <p className="mt-2 text-sm text-muted-fg leading-relaxed">
                Compre, venda e troque com vizinhos verificados. Sem golpe — você sabe com quem está negociando.
              </p>
            </div>

            {/* Chat */}
            <div className="group bg-bg rounded-lg p-6 transition-all duration-200 hover:scale-[1.02] cursor-default">
              <FeatureIcon bg="bg-emerald-100 text-emerald-600">
                <IconChat />
              </FeatureIcon>
              <h3 className="mt-5 text-xl font-extrabold text-fg">Chat Privado</h3>
              <p className="mt-2 text-sm text-muted-fg leading-relaxed">
                Converse de forma direta e segura com qualquer vizinho verificado. Sem expor seu telefone.
              </p>
            </div>

            {/* Grupos */}
            <div className="group bg-bg rounded-lg p-6 transition-all duration-200 hover:scale-[1.02] cursor-default">
              <FeatureIcon bg="bg-violet-100 text-violet-600">
                <IconUsers />
              </FeatureIcon>
              <h3 className="mt-5 text-xl font-extrabold text-fg">Grupos de Interesse</h3>
              <p className="mt-2 text-sm text-muted-fg leading-relaxed">
                Jardinagem, pets, esportes, segurança… crie ou entre em grupos com quem compartilha seus interesses.
              </p>
            </div>
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
                { step: 1, text: "Informe seu CEP — identificamos seu bairro automaticamente" },
                { step: 2, text: "Envie uma foto do seu comprovante de residência" },
                { step: 3, text: "Nosso time valida em até 24h — você recebe e-mail de confirmação" },
                { step: 4, text: "Acesso completo ao feed, marketplace e grupos do seu bairro" },
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
            <div className="relative bg-bg rounded-lg p-8 max-w-xs w-full border-2 border-border">
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
                <span className="inline-flex items-center gap-2 bg-primary/10 text-primary
                                  rounded-full px-4 py-2 text-sm font-semibold w-fit">
                  <span className="text-primary"><IconMapPin /></span>
                  Praia da Costa · 3 anos no bairro
                </span>
              </div>

              <div className="mt-6 pt-6 border-t-2 border-border">
                <p className="text-xs text-muted-fg font-medium">
                  Verificada em 15 de março de 2025
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          MARKETPLACE PREVIEW — amber-50 tinted
      ══════════════════════════════════════════════════════ */}
      <section className="bg-amber-50 py-20 px-6 overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600 mb-3">
                Marketplace
              </p>
              <h2 className="text-4xl md:text-5xl font-extrabold text-fg tracking-tight">
                Compre e venda com<br />quem você conhece.
              </h2>
            </div>
            <Link
              href="/register/"
              className="h-12 px-6 rounded-lg bg-amber-500 text-white font-semibold text-sm shrink-0
                         flex items-center gap-2 transition-all duration-200 hover:bg-amber-600 hover:scale-[1.03] w-fit"
            >
              Ver marketplace
              <IconArrowRight />
            </Link>
          </div>

          {/* Fake listings grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <FakeListingCard title="Bicicleta caloi aro 26 conservada" price="R$&nbsp;380" category="Esporte" verified />
            <FakeListingCard title="Mesa de escritório cor carvalho" price="R$&nbsp;250" category="Móveis" verified />
            <FakeListingCard title="Aulas de violão para crianças" price="R$&nbsp;80/aula" category="Serviços" verified />
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          LOCAL TRUST — emerald-50, feature list
      ══════════════════════════════════════════════════════ */}
      <section className="bg-emerald-50 py-20 px-6">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Checklist */}
          <ul className="space-y-4">
            {[
              "Sem algoritmo — veja tudo do seu bairro, em ordem cronológica",
              "Sem anúncios patrocinados — nunca",
              "Seus dados ficam no Brasil",
              "Código aberto para auditoria da comunidade",
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
              Feito para o bairro,<br />não para o anunciante.
            </h2>
            <p className="text-lg text-muted-fg leading-relaxed">
              O BairroNow existe para conectar vizinhos reais — não para vender sua atenção.
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
            <Link
              href="/login/"
              className="h-14 px-8 rounded-lg border-4 border-white/30 text-white font-semibold text-base
                         flex items-center transition-all duration-200 hover:border-white hover:scale-[1.03]"
            >
              Já tenho conta
            </Link>
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════
          FOOTER — dark slate-900
      ══════════════════════════════════════════════════════ */}
      <footer className="bg-slate-900 text-white py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2 font-extrabold text-lg">
            <Image src="/brand/logo-icon.png" alt="BairroNow" width={28} height={28} />
            BairroNow
          </div>

          <nav className="flex flex-wrap items-center gap-6 text-sm font-medium text-white/60">
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

          <p className="text-sm text-white/40 font-medium">
            © {new Date().getFullYear()} BairroNow
          </p>
        </div>
      </footer>

    </div>
  );
}
