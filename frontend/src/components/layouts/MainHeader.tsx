"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/auth";
import { useChatStore } from "@/stores/chat-store";
import ThemeToggle from "@/components/ThemeToggle";

const navItems = [
  {
    href: "/feed/",
    label: "Feed",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    href: "/marketplace/",
    label: "Marketplace",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
        <line x1="3" y1="6" x2="21" y2="6" />
        <path d="M16 10a4 4 0 0 1-8 0" />
      </svg>
    ),
  },
  {
    href: "/chat/",
    label: "Chat",
    badge: true,
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: "/map/",
    label: "Mapa",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </svg>
    ),
  },
  {
    href: "/businesses/",
    label: "Negócios",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </svg>
    ),
  },
  {
    href: "/events/",
    label: "Eventos",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/profile/",
    label: "Perfil",
    icon: (
      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    ),
  },
];

const adminNavItem = {
  href: "/admin/moderation/",
  label: "Admin",
  adminOnly: true,
  icon: (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
};

export default function MainHeader() {
  const router = useRouter();
  const pathname = usePathname();
  const logout = useAuthStore((s) => s.logout);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin === true;
  const connect = useChatStore((s) => s.connect);
  const loadUnread = useChatStore((s) => s.loadUnread);
  const unreadTotal = useChatStore((s) => s.unreadTotal);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    void connect();
    void loadUnread();
  }, [isAuthenticated, connect, loadUnread]);

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  const handleLogout = () => {
    logout();
    router.push("/login/");
  };

  return (
    <header
      className={[
        "sticky top-0 z-40 w-full transition-all duration-300",
        scrolled
          ? "bg-card/80 backdrop-blur-xl border-b border-border/60 shadow-sm"
          : "bg-bg border-b border-border/40",
      ].join(" ")}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        {/* Logo */}
        <Link
          href="/feed/"
          className="flex items-center gap-2 shrink-0 group"
        >
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

        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1 bg-muted rounded-2xl p-1">
          {[...navItems, ...(isAdmin ? [adminNavItem] : [])].map((item) => {
            const active = pathname?.startsWith(item.href.replace(/\/$/, ""));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={[
                  "relative flex items-center gap-1.5 px-3 py-2 rounded-xl",
                  "text-sm font-semibold transition-all duration-200",
                  active
                    ? "bg-card text-primary shadow-xs"
                    : "text-muted-fg hover:text-fg hover:bg-card/60",
                  "adminOnly" in item && item.adminOnly ? "text-amber-600 hover:text-amber-700" : "",
                ].join(" ")}
              >
                {item.icon}
                <span>{item.label}</span>
                {"badge" in item && item.badge && unreadTotal > 0 && (
                  <span className="absolute -top-1 -right-1 bg-danger text-white text-[9px] font-extrabold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1 animate-badge-pop">
                    {unreadTotal > 99 ? "99+" : unreadTotal}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right controls */}
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <button
            onClick={handleLogout}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold text-muted-fg hover:text-danger hover:bg-danger-light transition-all duration-200"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            Sair
          </button>
        </div>
      </div>

      {/* Mobile nav */}
      <div className="md:hidden flex items-center justify-around border-t border-border/40 bg-card/95 backdrop-blur-sm px-2 pb-1 pt-1">
        {[...navItems, ...(isAdmin ? [adminNavItem] : [])].map((item) => {
          const active = pathname?.startsWith(item.href.replace(/\/$/, ""));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "relative flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl",
                "text-[10px] font-semibold transition-all duration-200",
                active ? "text-primary" : "text-muted-fg",
              ].join(" ")}
            >
              <span className={active ? "scale-110" : ""}>{item.icon}</span>
              <span>{item.label}</span>
              {"badge" in item && item.badge && unreadTotal > 0 && (
                <span className="absolute top-1 right-1 bg-danger text-white text-[8px] font-extrabold rounded-full min-w-[14px] h-3.5 flex items-center justify-center px-0.5">
                  {unreadTotal > 9 ? "9+" : unreadTotal}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
