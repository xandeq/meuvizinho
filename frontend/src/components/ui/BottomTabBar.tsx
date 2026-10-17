"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export interface BottomTab {
  href: string;
  label: string;
  /** 24×24 SVG path data — fill="currentColor" or stroke="currentColor" */
  icon: (active: boolean) => React.ReactNode;
  badge?: number;
}

export interface BottomTabBarProps {
  tabs: BottomTab[];
}

/**
 * Mobile-only bottom navigation bar.
 * Active tab: solid blue-600 pill wrapping the icon.
 * Hidden on md+ (desktop uses MainHeader).
 */
export default function BottomTabBar({ tabs }: BottomTabBarProps) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Navegação principal"
      className={[
        "fixed bottom-0 inset-x-0 z-40 md:hidden",
        // Fundo sólido: a 90% o conteúdo azul que rolava por baixo deixava o rótulo da aba ativa ilegível (axe).
        "bg-bg border-t border-border/50",
        "flex items-center justify-around px-2 py-2 pb-safe",
      ].join(" ")}
    >
      {tabs.map((tab) => {
        const active = pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className="relative flex flex-col items-center gap-0.5 min-w-[3rem]"
          >
            {/* Active pill behind icon */}
            <span
              className={[
                "flex items-center justify-center w-12 h-8 rounded-full transition-colors duration-150",
                active ? "bg-primary" : "bg-transparent",
              ].join(" ")}
            >
              <span className={active ? "text-white" : "text-muted-fg"}>
                {tab.icon(active)}
              </span>
            </span>

            <span
              className={[
                "text-[10px] font-semibold leading-none",
                active ? "text-primary" : "text-muted-fg",
              ].join(" ")}
            >
              {tab.label}
            </span>

            {tab.badge !== undefined && tab.badge > 0 && (
              <span
                aria-label={`${tab.badge} não lidas`}
                className={[
                  "absolute -top-0.5 right-1.5",
                  "min-w-[1.125rem] h-[1.125rem] px-1",
                  "bg-danger text-white text-[10px] font-extrabold",
                  "rounded-full flex items-center justify-center",
                ].join(" ")}
              >
                {tab.badge > 99 ? "99+" : tab.badge}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
