"use client";

import { InputHTMLAttributes, forwardRef } from "react";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
  icon?: React.ReactNode;
  suffix?: React.ReactNode;
}

const baseClasses = [
  "w-full rounded-xl bg-muted text-fg text-sm",
  "border border-border",
  "placeholder:text-muted-fg/50",
  "outline-none transition-all duration-200",
  "focus:bg-card focus:border-primary focus:shadow-[0_0_0_3px_rgba(37,99,235,0.10)]",
  "h-12",
].join(" ");

const errorClasses =
  "border-danger bg-danger-light focus:border-danger focus:shadow-[0_0_0_3px_rgba(220,38,38,0.10)]";

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { error = false, icon, suffix, className = "", ...rest },
  ref
) {
  if (icon || suffix) {
    return (
      <div className="relative flex items-center">
        {icon && (
          <span
            className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted-fg pointer-events-none select-none"
            aria-hidden
          >
            {icon}
          </span>
        )}
        <input
          ref={ref}
          className={[
            baseClasses,
            error ? errorClasses : "",
            icon ? "pl-10" : "pl-4",
            suffix ? "pr-10" : "pr-4",
            className,
          ]
            .filter(Boolean)
            .join(" ")}
          {...rest}
        />
        {suffix && (
          <span className="absolute right-0 flex items-center justify-center h-full pr-1">
            {suffix}
          </span>
        )}
      </div>
    );
  }

  return (
    <input
      ref={ref}
      className={[
        baseClasses,
        "px-4",
        error ? errorClasses : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    />
  );
});

export default Input;
