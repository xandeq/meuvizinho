"use client";

import { forwardRef, useState } from "react";
import FormField, { type FormFieldProps } from "@/components/ui/FormField";

const LockIcon = () => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
);

const EyeIcon = ({ open }: { open: boolean }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {open ? (
      <>
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ) : (
      <>
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
        <line x1="1" y1="1" x2="23" y2="23" />
      </>
    )}
  </svg>
);

/** Campo de senha com cadeado e botão mostrar/ocultar (mesmo padrão do login). */
const PasswordField = forwardRef<HTMLInputElement, Omit<FormFieldProps, "type" | "icon" | "suffix">>(
  function PasswordField(props, ref) {
    const [visible, setVisible] = useState(false);
    return (
      <FormField
        ref={ref}
        {...props}
        type={visible ? "text" : "password"}
        icon={<LockIcon />}
        suffix={
          <button
            type="button"
            aria-label={visible ? `Ocultar ${props.label.toLowerCase()}` : `Mostrar ${props.label.toLowerCase()}`}
            aria-pressed={visible}
            onClick={() => setVisible((v) => !v)}
            className="p-2 text-muted-fg hover:text-fg transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
          >
            <EyeIcon open={visible} />
          </button>
        }
      />
    );
  }
);

export default PasswordField;
