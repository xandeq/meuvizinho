import { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import Footer from "./Footer";

export interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  illustration?: string;
  leftPanel?: ReactNode;
  children: ReactNode;
}

function LogoMark() {
  return (
    <Link href="/" className="flex items-center gap-2 group">
      <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center shadow-blue">
        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </div>
      <span className="text-lg font-extrabold tracking-tight text-fg group-hover:text-primary transition-colors">
        BairroNow
      </span>
    </Link>
  );
}

export default function AuthLayout({
  title,
  subtitle,
  illustration,
  leftPanel,
  children,
}: AuthLayoutProps) {
  if (leftPanel) {
    return (
      <div className="min-h-[100dvh] flex flex-col lg:flex-row">
        {/* Mobile-only header */}
        <header className="lg:hidden px-6 py-4 flex items-center justify-between border-b border-border/40 bg-card">
          <LogoMark />
        </header>

        {/* Left brand panel — desktop only */}
        <aside className="hidden lg:flex lg:w-[52%] xl:w-[55%] min-h-screen flex-col flex-shrink-0">
          {leftPanel}
        </aside>

        {/* Right form area */}
        <div className="flex-1 flex flex-col bg-bg">
          <div className="flex-1 flex items-center justify-center px-4 py-12 lg:py-16">
            <div className="w-full max-w-md animate-fade-up">
              <div className="mb-8 text-center">
                <h1 className="text-2xl font-extrabold tracking-tight text-fg">
                  {title}
                </h1>
                {subtitle && (
                  <p className="mt-1.5 text-sm text-muted-fg">{subtitle}</p>
                )}
              </div>
              {/* gradient-card-border for premium border effect */}
              <div className="gradient-card-border rounded-3xl">
                <div className="bg-card rounded-3xl p-8 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.08),0_4px_16px_-4px_rgba(37,99,235,0.06)]">
                  {children}
                </div>
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col bg-bg">
      <header className="px-6 py-4 flex items-center justify-between border-b border-border/40">
        <LogoMark />
      </header>

      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute -top-48 -right-48 w-96 h-96 rounded-full bg-primary opacity-[0.04]" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full bg-secondary opacity-[0.04]" />
        <div className="absolute top-1/2 left-1/3 w-48 h-48 rounded-full bg-accent opacity-[0.03]" />
      </div>

      <main className="relative flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md animate-fade-up">
          {illustration && (
            <div className="mb-5 rounded-2xl overflow-hidden shadow-md">
              <Image
                src={illustration}
                alt=""
                width={896}
                height={504}
                className="w-full object-cover"
                priority
              />
            </div>
          )}
          <div className="bg-card border border-border/50 rounded-3xl p-8 shadow-lg">
            <div className="mb-7 text-center">
              <h1 className="text-2xl font-extrabold tracking-tight text-fg">
                {title}
              </h1>
              {subtitle && (
                <p className="mt-1.5 text-sm text-muted-fg">{subtitle}</p>
              )}
            </div>
            {children}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
