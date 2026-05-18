"use client";

export default function OfflinePage() {
  return (
    <>
      {/* ── Decorative background blobs ─────────────────────── */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        {/* Top-left blob — primary blue */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-80px",
            width: "420px",
            height: "420px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
          }}
        />
        {/* Bottom-right blob — secondary emerald */}
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            right: "-60px",
            width: "380px",
            height: "380px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(5,150,105,0.10) 0%, transparent 70%)",
            filter: "blur(48px)",
          }}
        />
        {/* Center-top accent */}
        <div
          style={{
            position: "absolute",
            top: "20%",
            left: "55%",
            width: "220px",
            height: "220px",
            borderRadius: "9999px",
            background:
              "radial-gradient(circle, rgba(37,99,235,0.07) 0%, transparent 70%)",
            filter: "blur(32px)",
          }}
        />
      </div>

      {/* ── Main layout ─────────────────────────────────────── */}
      <div className="relative min-h-[100dvh] flex flex-col items-center justify-center bg-bg px-6">
        {/* ── Card ──────────────────────────────────────────── */}
        <div
          className="animate-fade-up w-full max-w-sm rounded-3xl bg-card px-8 py-10 text-center"
          style={{
            boxShadow: "var(--shadow-xl)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* ── Signal bars icon ────────────────────────────── */}
          <div className="relative inline-flex items-end gap-[5px] h-12 mb-8">
            {[
              { h: 12, active: true,  delay: "0ms" },
              { h: 20, active: true,  delay: "150ms" },
              { h: 28, active: false, delay: "300ms" },
              { h: 36, active: false, delay: "450ms" },
            ].map(({ h, active, delay }, i) => (
              <div
                key={i}
                style={{
                  width: "12px",
                  height: `${h}px`,
                  borderRadius: "4px",
                  backgroundColor: active
                    ? "var(--color-primary)"
                    : "var(--color-border)",
                  opacity: active ? 1 : 0.35,
                  animation: active
                    ? `signal-pulse 1.8s ease-in-out ${delay} infinite`
                    : "none",
                }}
              />
            ))}

            {/* X badge over the inactive bars */}
            <div
              aria-hidden="true"
              style={{
                position: "absolute",
                top: "-6px",
                right: "-10px",
                width: "22px",
                height: "22px",
                borderRadius: "9999px",
                backgroundColor: "var(--color-danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 2px 8px rgba(220,38,38,0.35)",
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                strokeWidth="3"
                strokeLinecap="round"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>

          {/* ── Copy ────────────────────────────────────────── */}
          <h1
            className="text-2xl font-extrabold tracking-tight text-fg mb-2 animate-fade-up stagger-1"
          >
            Sem conexao
          </h1>
          <p
            className="text-sm leading-relaxed mb-8 animate-fade-up stagger-2"
            style={{ color: "var(--color-muted-fg)", maxWidth: "260px", margin: "0 auto 2rem" }}
          >
            Verifique sua internet e tente novamente. Algumas paginas podem
            estar disponiveis no cache.
          </p>

          {/* ── Primary action ──────────────────────────────── */}
          <button
            onClick={() => window.location.reload()}
            className="w-full px-6 py-3 font-semibold rounded-2xl text-white transition-all duration-200 active:scale-95 animate-fade-up stagger-3"
            style={{
              backgroundColor: "var(--color-primary)",
              boxShadow: "var(--shadow-blue)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "var(--color-primary-hover)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                "var(--color-primary)";
            }}
          >
            Tentar novamente
          </button>

          {/* ── Secondary link ──────────────────────────────── */}
          <a
            href="/feed/"
            className="block mt-4 text-sm font-medium transition-colors duration-150 animate-fade-up stagger-4"
            style={{ color: "var(--color-muted-fg)" }}
            onMouseEnter={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color =
                "var(--color-primary)")
            }
            onMouseLeave={(e) =>
              ((e.currentTarget as HTMLAnchorElement).style.color =
                "var(--color-muted-fg)")
            }
          >
            Ir para o Feed
          </a>
        </div>
      </div>

      {/* ── Keyframe for signal bars ────────────────────────── */}
      <style>{`
        @keyframes signal-pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.45; }
        }
      `}</style>
    </>
  );
}
