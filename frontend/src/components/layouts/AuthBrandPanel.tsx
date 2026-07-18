import Link from "next/link";

const features = [
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
    title: "Marketplace local",
    desc: "Compre e venda perto de você",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
    title: "Chat com vizinhos",
    desc: "Mensagens diretas e em grupos",
  },
  {
    icon: (
      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    ),
    title: "Eventos e notícias",
    desc: "Tudo que acontece no bairro",
  },
];

const stats = [
  { value: "100%", label: "identidades verificadas" },
  { value: "3", label: "bairros no piloto" },
  { value: "0", label: "anúncios patrocinados" },
];

export interface AuthBrandPanelProps {
  headline?: React.ReactNode;
  subhead?: string;
}

export default function AuthBrandPanel({
  headline = (
    <>
      Seu bairro,<br />
      <span
        className="text-transparent bg-clip-text animate-gradient-text"
        style={{
          backgroundImage: "linear-gradient(135deg, #93c5fd 0%, #60a5fa 50%, #bfdbfe 100%)",
        }}
      >
        conectado de verdade.
      </span>
    </>
  ),
  subhead = "Diretório de grupos WhatsApp verificados, marketplace entre vizinhos e feed local — tudo com identidade comprovada.",
}: AuthBrandPanelProps) {
  return (
    <div
      className="relative flex flex-col justify-between h-full min-h-[100dvh] p-10 xl:p-14 overflow-hidden text-white"
      style={{ background: "linear-gradient(160deg, #0a1128 0%, #0f1f45 55%, #123166 100%)" }}
    >
      {/* Background — static noise layer (no GPU repaint) */}
      <div
        className="pointer-events-none select-none absolute inset-0"
        aria-hidden
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='0.035'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Decorative orbs — float-animated, blue-only accent */}
      <div className="pointer-events-none select-none absolute inset-0 overflow-hidden" aria-hidden>
        <div
          className="absolute top-[-80px] right-[-80px] w-80 h-80 rounded-full animate-float"
          style={{
            background: "radial-gradient(circle, rgba(96,165,250,0.20) 0%, transparent 70%)",
            animationDuration: "7s",
          }}
        />
        <div
          className="absolute bottom-[-60px] left-[-60px] w-72 h-72 rounded-full animate-float"
          style={{
            background: "radial-gradient(circle, rgba(37,99,235,0.16) 0%, transparent 70%)",
            animationDuration: "9s",
            animationDelay: "1.5s",
          }}
        />
        <div
          className="absolute top-[45%] left-[20%] w-52 h-52 rounded-full animate-float"
          style={{
            background: "radial-gradient(circle, rgba(147,197,253,0.10) 0%, transparent 70%)",
            animationDuration: "11s",
            animationDelay: "3s",
          }}
        />

        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.035]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid-auth" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="white" strokeWidth="0.8" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid-auth)" />
        </svg>

        {/* Floating house marks */}
        <svg className="absolute top-[18%] right-[10%] w-14 h-14 opacity-[0.09] animate-float" style={{ animationDuration: "8s", animationDelay: "0.5s" }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <svg className="absolute top-[57%] right-[7%] w-9 h-9 opacity-[0.06] animate-float" style={{ animationDuration: "10s", animationDelay: "2s" }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
        <svg className="absolute top-[72%] left-[6%] w-11 h-11 opacity-[0.05] animate-float" style={{ animationDuration: "6s", animationDelay: "4s" }} viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>

      {/* Logo */}
      <div className="relative z-10 animate-fade-in">
        <Link href="/" className="inline-flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-white/12 border border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm flex items-center justify-center group-hover:bg-white/18 transition-colors duration-300">
            <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          </div>
          <span className="text-xl font-extrabold tracking-tight text-white">Meu Vizinho</span>
        </Link>
      </div>

      {/* Hero content */}
      <div className="relative z-10 space-y-8 animate-fade-up" style={{ animationDelay: "100ms" }}>
        <div className="space-y-5">
          {/* Live badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/18 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] text-xs font-semibold text-white/90 backdrop-blur-sm">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse-dot" />
            Piloto ativo em Vila Velha, ES
          </div>

          {/* Headline */}
          <h2 className="text-3xl xl:text-4xl font-extrabold leading-tight tracking-tight">
            {headline}
          </h2>

          <p className="text-sm text-white/65 leading-relaxed max-w-[34ch]">
            {subhead}
          </p>
        </div>

        {/* Feature list — staggered entrance */}
        <div className="space-y-2.5 feature-stagger">
          {features.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3.5 animate-slide-up"
            >
              <div className="w-10 h-10 rounded-xl bg-white/10 border border-white/15 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] flex items-center justify-center shrink-0 text-white/85">
                {f.icon}
              </div>
              <div>
                <p className="text-sm font-semibold text-white leading-tight">{f.title}</p>
                <p className="text-xs text-white/55 mt-0.5">{f.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Stats — liquid glass, honest pilot-stage numbers (mirrors homepage) */}
      <div className="relative z-10 animate-fade-up" style={{ animationDelay: "250ms" }}>
        <div className="grid grid-cols-3 gap-px rounded-2xl overflow-hidden border border-white/12 bg-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] backdrop-blur-md">
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={[
                "flex flex-col items-center py-4 px-1 text-center",
                i < stats.length - 1 ? "border-r border-white/10" : "",
              ].join(" ")}
            >
              <p className="text-xl font-extrabold text-white tracking-tight">{s.value}</p>
              <p className="text-[10.5px] text-white/50 mt-0.5 font-medium leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
