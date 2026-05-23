"use client";
import { useEffect, useState } from "react";

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  colorClass?: string; // e.g. "text-primary", "text-danger"
  delay?: number; // ms
}

export default function StatCard({ label, value, icon, colorClass = "text-primary", delay = 0 }: StatCardProps) {
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    const start = Date.now() + delay;
    const duration = 800;
    let frame: number;

    const tick = () => {
      const now = Date.now();
      if (now < start) { frame = requestAnimationFrame(tick); return; }
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayed(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value, delay]);

  return (
    <div className="bg-card rounded-2xl border border-border/50 shadow-sm p-5 hover:-translate-y-1 hover:shadow-md transition-all duration-300 ease-out animate-slide-up">
      <div className="flex items-center justify-between mb-3">
        <span className={`w-10 h-10 rounded-xl flex items-center justify-center bg-muted ${colorClass}`}>
          {icon}
        </span>
      </div>
      <div className={`text-3xl font-extrabold tracking-tight ${colorClass}`}>
        {displayed.toLocaleString("pt-BR")}
      </div>
      <div className="text-sm text-muted-fg mt-1 font-medium">{label}</div>
    </div>
  );
}
