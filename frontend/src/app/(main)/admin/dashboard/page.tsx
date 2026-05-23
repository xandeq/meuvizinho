"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import FeedHeader from "@/components/layouts/FeedHeader";
import { useAuthStore } from "@/lib/auth";
import api from "@/lib/api";

interface DayPoint {
  date: string;
  count: number;
}

interface StatsResponse {
  totals: {
    users: number;
    posts: number;
    pendingReports: number;
    pendingVerifications: number;
    groups: number;
    listings: number;
  };
  postsPerDay: DayPoint[];
  usersPerDay: DayPoint[];
}

function SkeletonCard() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 animate-pulse">
      <div className="h-3 w-24 bg-muted rounded mb-3" />
      <div className="h-8 w-16 bg-muted rounded" />
    </div>
  );
}

function SkeletonChart() {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 animate-pulse">
      <div className="h-3 w-36 bg-muted rounded mb-4" />
      <div className="h-48 bg-muted rounded-xl" />
    </div>
  );
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass: string;
}

function StatCard({ label, value, icon, colorClass }: StatCardProps) {
  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-semibold text-muted-fg uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-extrabold text-fg">{value.toLocaleString("pt-BR")}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.isAdmin === true;

  const [stats, setStats] = useState<StatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const { data } = await api.get<StatsResponse>("/api/v1/admin/stats");
        if (!cancelled) setStats(data);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "Erro ao carregar estatísticas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => { cancelled = true; };
  }, [isAdmin]);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <FeedHeader />
        <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-6">
          <h1 className="text-xl font-extrabold text-fg">Acesso negado</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-slide-up">
      <FeedHeader />
      <h1 className="text-2xl font-extrabold text-fg">Dashboard</h1>

      {error && (
        <div className="bg-danger/10 border border-danger/30 rounded-xl p-4">
          <p className="text-sm font-semibold text-danger">{error}</p>
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <StatCard
            label="Total usuários"
            value={stats.totals.users}
            colorClass="bg-primary/10 text-primary"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Total posts"
            value={stats.totals.posts}
            colorClass="bg-green-500/10 text-green-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" />
                <line x1="16" y1="17" x2="8" y2="17" />
                <polyline points="10 9 9 9 8 9" />
              </svg>
            }
          />
          <StatCard
            label="Relatórios pendentes"
            value={stats.totals.pendingReports}
            colorClass="bg-danger/10 text-danger"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            }
          />
          <StatCard
            label="Verificações pendentes"
            value={stats.totals.pendingVerifications}
            colorClass="bg-amber-500/10 text-amber-600"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            }
          />
          <StatCard
            label="Grupos ativos"
            value={stats.totals.groups}
            colorClass="bg-accent/10 text-accent"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            }
          />
          <StatCard
            label="Anúncios no marketplace"
            value={stats.totals.listings}
            colorClass="bg-muted text-muted-fg"
            icon={
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
            }
          />
        </div>
      ) : null}

      {/* Charts */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <SkeletonChart />
          <SkeletonChart />
        </div>
      ) : stats ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Posts per day — Area chart */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <h2 className="text-sm font-bold text-fg mb-4">Posts por dia (7 dias)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={stats.postsPerDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="postsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-fg, #9ca3af)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-fg, #9ca3af)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card, #fff)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  name="Posts"
                  stroke="#2563EB"
                  strokeWidth={2}
                  fill="url(#postsGradient)"
                  dot={{ fill: "#2563EB", r: 3 }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* New users per day — Bar chart */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5">
            <h2 className="text-sm font-bold text-fg mb-4">Novos usuários por dia (7 dias)</h2>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats.usersPerDay} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border, #e5e7eb)" strokeOpacity={0.5} />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-muted-fg, #9ca3af)" />
                <YAxis tick={{ fontSize: 11 }} stroke="var(--color-muted-fg, #9ca3af)" allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: "var(--color-card, #fff)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ fontWeight: 700 }}
                />
                <Bar dataKey="count" name="Usuários" fill="#10B981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
