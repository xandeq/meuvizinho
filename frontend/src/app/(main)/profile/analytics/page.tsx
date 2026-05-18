"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuthStore } from "@/lib/auth";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Cell,
} from "recharts";

interface DayCount { date: string; count: number }
interface StarCount { stars: number; count: number }

interface AnalyticsData {
  totalViews: number;
  viewsThisWeek: number;
  viewsLast30Days: number;
  viewsByDay: DayCount[];
  ratingAverage: number | null;
  ratingTotal: number;
  ratingDistribution: StarCount[];
}

function ArrowLeftIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5M12 5l-7 7 7 7" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function StarFilledIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </svg>
  );
}

function TrendingUpIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  iconBg,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  iconBg: string;
}) {
  return (
    <div className="bg-card rounded-2xl border border-border/70 p-5 flex items-start gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${iconBg}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs uppercase font-bold text-fg/50 tracking-wide leading-none">{label}</p>
        <p className="text-2xl font-extrabold text-fg leading-tight mt-1">{value}</p>
        {sub && <p className="text-xs text-muted-fg mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function formatShortDate(dateStr: string) {
  const d = new Date(dateStr + "T12:00:00Z");
  return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" });
}

const STAR_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#059669"];

const CHART_THEME = {
  primary: "#2563EB",
  border: "#E2E8F0",
  fg: "#0F172A",
  mutedFg: "#64748B",
  card: "#FFFFFF",
};

export default function AnalyticsPage() {
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const API = process.env.NEXT_PUBLIC_API_URL ?? "https://api.bairronow.com.br";

  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id || !token) return;
    setLoading(true);
    fetch(`${API}/api/v1/users/${user.id}/analytics`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`Erro ${r.status}`);
        return r.json();
      })
      .then((d: AnalyticsData) => setData(d))
      .catch((e) => setError(e instanceof Error ? e.message : "Erro ao carregar"))
      .finally(() => setLoading(false));
  }, [user?.id, token, API]);

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="h-5 w-28 rounded-full animate-shimmer" />
        <div className="h-7 w-56 rounded-full animate-shimmer" />
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-2xl animate-shimmer" />
          ))}
        </div>
        <div className="h-60 rounded-2xl animate-shimmer" />
        <div className="h-48 rounded-2xl animate-shimmer" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 text-center space-y-3">
        <p className="text-danger font-semibold">{error ?? "Não foi possível carregar os dados."}</p>
        <Link href="/profile/" className="text-sm text-primary hover:underline">
          ← Voltar ao perfil
        </Link>
      </div>
    );
  }

  // Show a date label every 5 days to avoid crowding
  const viewsTickFormatter = (_: string, index: number) => {
    if (index % 5 !== 0) return "";
    return formatShortDate(data.viewsByDay[index]?.date ?? "");
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Back */}
      <Link
        href="/profile/"
        className="inline-flex items-center gap-1.5 text-sm text-muted-fg hover:text-fg transition-colors"
      >
        <ArrowLeftIcon />
        <span>Perfil</span>
      </Link>

      <div>
        <h1 className="text-2xl font-extrabold text-fg">Analytics do Negócio</h1>
        <p className="text-sm text-muted-fg mt-1">Dados de visualizações e avaliações do perfil</p>
      </div>

      {/* KPI grid */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard
          label="Views totais"
          value={data.totalViews.toLocaleString("pt-BR")}
          icon={<EyeIcon />}
          iconBg="bg-primary/10 text-primary"
        />
        <KpiCard
          label="Esta semana"
          value={data.viewsThisWeek.toLocaleString("pt-BR")}
          sub="últimos 7 dias"
          icon={<TrendingUpIcon />}
          iconBg="bg-secondary/10 text-secondary"
        />
        <KpiCard
          label="Nota média"
          value={data.ratingAverage != null ? data.ratingAverage.toFixed(1) : "—"}
          sub={
            data.ratingTotal > 0
              ? `${data.ratingTotal} avaliação${data.ratingTotal !== 1 ? "ões" : ""}`
              : "sem avaliações"
          }
          icon={<StarFilledIcon />}
          iconBg="bg-accent/15 text-accent"
        />
        <KpiCard
          label="Views 30 dias"
          value={data.viewsLast30Days.toLocaleString("pt-BR")}
          sub="últimas 4 semanas"
          icon={<CalendarIcon />}
          iconBg="bg-primary/5 text-primary"
        />
      </div>

      {/* Views over time */}
      <div className="bg-card rounded-2xl border border-border/70 p-6">
        <h2 className="text-sm font-bold text-fg/70 uppercase tracking-wide mb-5">
          Visualizações por dia — últimos 30 dias
        </h2>
        {data.viewsLast30Days === 0 ? (
          <div className="h-[180px] flex items-center justify-center">
            <p className="text-sm text-muted-fg">Nenhuma visualização registrada ainda.</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart
              data={data.viewsByDay}
              margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_THEME.border}
                opacity={0.7}
              />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: CHART_THEME.mutedFg }}
                tickFormatter={viewsTickFormatter}
                axisLine={false}
                tickLine={false}
                interval={0}
              />
              <YAxis
                tick={{ fontSize: 11, fill: CHART_THEME.mutedFg }}
                allowDecimals={false}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: CHART_THEME.card,
                  border: `1px solid ${CHART_THEME.border}`,
                  borderRadius: "0.75rem",
                  fontSize: "0.75rem",
                  color: CHART_THEME.fg,
                  boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                }}
                labelFormatter={(label) => formatShortDate(String(label))}
                formatter={(value) => [`${value}`, "visualizações"] as [string, string]}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke={CHART_THEME.primary}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4, fill: CHART_THEME.primary, strokeWidth: 0 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Rating distribution */}
      <div className="bg-card rounded-2xl border border-border/70 p-6">
        <h2 className="text-sm font-bold text-fg/70 uppercase tracking-wide mb-5">
          Distribuição das avaliações
        </h2>
        {data.ratingTotal === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8">
            <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center text-accent">
              <StarFilledIcon />
            </div>
            <p className="text-sm font-semibold text-fg">Sem avaliações ainda</p>
            <p className="text-xs text-muted-fg text-center max-w-xs">
              As avaliações aparecerão aqui quando clientes avaliarem seu negócio no bairro.
            </p>
          </div>
        ) : (
          <>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart
                data={data.ratingDistribution}
                margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke={CHART_THEME.border}
                  opacity={0.7}
                />
                <XAxis
                  dataKey="stars"
                  tick={{ fontSize: 11, fill: CHART_THEME.mutedFg }}
                  tickFormatter={(v: number) => `${v}★`}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: CHART_THEME.mutedFg }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: CHART_THEME.card,
                    border: `1px solid ${CHART_THEME.border}`,
                    borderRadius: "0.75rem",
                    fontSize: "0.75rem",
                    color: CHART_THEME.fg,
                    boxShadow: "0 4px 16px rgba(15,23,42,0.08)",
                  }}
                  formatter={(value, _name, entry) =>
                    [`${value}`, `${(entry as { payload?: StarCount }).payload?.stars ?? "?"}★`] as [string, string]
                  }
                  labelFormatter={() => ""}
                />
                <Bar dataKey="count" radius={[6, 6, 0, 0]} maxBarSize={60}>
                  {data.ratingDistribution.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={STAR_COLORS[entry.stars - 1] ?? STAR_COLORS[4]}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="flex items-center justify-center gap-4 mt-4 flex-wrap">
              {data.ratingDistribution.map((item) => (
                <div key={item.stars} className="flex items-center gap-1.5 text-xs text-muted-fg">
                  <span
                    className="w-2.5 h-2.5 rounded-sm inline-block"
                    style={{ backgroundColor: STAR_COLORS[item.stars - 1] }}
                  />
                  <span>{item.stars}★</span>
                  <span className="font-semibold text-fg">{item.count}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
