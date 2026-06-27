"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAuthStore } from "@/lib/auth";

const adminNav = [
  { href: "/admin/dashboard/", label: "Dashboard" },
  { href: "/admin/moderation/", label: "Moderação" },
  { href: "/admin/verifications/", label: "Verificações" },
  { href: "/admin/categories/", label: "Categorias" },
  { href: "/admin/groups/", label: "Grupos" },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isAdmin = useAuthStore((s) => s.user?.isAdmin === true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login/");
    } else if (!isAdmin) {
      router.replace("/feed/");
    }
  }, [isAuthenticated, isAdmin, router]);

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="space-y-4">
      {/* Admin subnav */}
      <nav className="flex flex-wrap gap-1 bg-muted rounded-2xl p-1">
        {adminNav.map((item) => {
          const active = pathname?.startsWith(item.href.replace(/\/$/, ""));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200",
                active
                  ? "bg-card text-primary shadow-xs"
                  : "text-muted-fg hover:text-fg hover:bg-card/60",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      {children}
    </div>
  );
}
