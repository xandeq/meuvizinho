import { HTMLAttributes } from "react";

export type BadgeVariant =
  | "primary"
  | "secondary"
  | "accent"
  | "muted"
  | "verified"
  | "danger"
  | "outline";

export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  dot?: boolean;
}

const variants: Record<BadgeVariant, string> = {
  primary:
    "bg-primary-light text-primary border border-primary-mid/40",
  secondary:
    "bg-secondary-light text-secondary border border-secondary/25",
  accent:
    "bg-accent-light text-accent border border-accent/25",
  muted:
    "bg-muted text-muted-fg border border-border/50",
  verified:
    "bg-secondary-light text-secondary border border-secondary/25",
  danger:
    "bg-danger-light text-red-700 dark:text-red-300 border border-danger/25",
  outline:
    "bg-transparent text-muted-fg border border-border/50",
};

const dotColors: Record<BadgeVariant, string> = {
  primary:  "bg-primary",
  secondary: "bg-secondary",
  accent:   "bg-accent",
  muted:    "bg-muted-fg",
  verified: "bg-secondary",
  danger:   "bg-danger",
  outline:  "bg-muted-fg",
};

const sizes: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-[11px] gap-1",
  md: "px-2.5 py-1 text-xs gap-1.5",
};

export default function Badge({
  variant = "primary",
  size = "sm",
  dot = false,
  className = "",
  children,
  ...rest
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center font-semibold rounded-full",
        variants[variant],
        sizes[size],
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {dot && (
        <span
          aria-hidden
          className={["w-1.5 h-1.5 rounded-full shrink-0", dotColors[variant]].join(" ")}
        />
      )}
      {children}
    </span>
  );
}
