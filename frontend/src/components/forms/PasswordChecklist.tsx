"use client";

import { PASSWORD_RULES } from "@bairronow/shared-validators";

/** Regra da senha visível enquanto a pessoa digita (a mesma da API). */
export default function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 pt-1" aria-label="Requisitos da senha">
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(value);
        return (
          <li
            key={rule.id}
            className={`flex items-center gap-1.5 text-xs font-medium transition-colors duration-200 ${ok ? "text-fg" : "text-muted-fg"}`}
          >
            <span
              aria-hidden
              className={`grid place-items-center w-4 h-4 shrink-0 rounded-full border transition-all duration-200 ease-out ${
                ok ? "bg-primary border-primary text-white" : "border-border-strong"
              }`}
            >
              {ok && (
                <svg viewBox="0 0 24 24" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12l5 5L20 7" />
                </svg>
              )}
            </span>
            {rule.label}
            <span className="sr-only">{ok ? ", atendido" : ", pendente"}</span>
          </li>
        );
      })}
    </ul>
  );
}
