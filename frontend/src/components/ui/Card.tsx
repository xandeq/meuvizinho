import { HTMLAttributes } from "react";

export type CardVariant =
  | "default"
  | "elevated"
  | "muted"
  | "glass"
  | "primary-tint"
  | "secondary-tint"
  | "accent-tint"
  | "dark"
  // Legacy aliases kept for backward compatibility
  | "white"
  | "blue-tint"
  | "green-tint"
  | "amber-tint";

export type CardPadding = "none" | "xs" | "sm" | "md" | "lg" | "xl";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;
  /** @deprecated Use variant instead */
  bg?: CardVariant;
  padding?: CardPadding;
  interactive?: boolean;
  ringOnHover?: boolean;
  liftOnHover?: boolean;
  border?: boolean;
}

const variantMap: Record<CardVariant, string> = {
  default:
    "bg-card border border-border/50",
  elevated:
    "bg-card border border-border/50 shadow-md",
  muted:
    "bg-muted border border-border/50",
  glass:
    "bg-card/70 backdrop-blur-xl border border-white/20 shadow-lg",
  "primary-tint":
    "bg-primary-light border border-primary-mid/30",
  "secondary-tint":
    "bg-secondary-light border border-secondary/20",
  "accent-tint":
    "bg-accent-light border border-accent/20",
  dark:
    "bg-slate-900 border border-slate-800 text-white",
  // Legacy aliases
  white:
    "bg-card border border-border/50",
  "blue-tint":
    "bg-primary-light border border-primary-mid/30",
  "green-tint":
    "bg-secondary-light border border-secondary/20",
  "amber-tint":
    "bg-accent-light border border-accent/20",
};

const padMap: Record<CardPadding, string> = {
  none: "",
  xs:   "p-3",
  sm:   "p-4",
  md:   "p-5",
  lg:   "p-6",
  xl:   "p-8",
};

export default function Card({
  variant,
  bg,
  padding = "md",
  interactive = false,
  ringOnHover = false,
  liftOnHover = false,
  border = false,
  className = "",
  children,
  ...rest
}: CardProps) {
  const resolvedVariant = variant ?? bg ?? "default";

  return (
    <div
      className={[
        "rounded-2xl",
        variantMap[resolvedVariant],
        padMap[padding],
        border ? "border border-border/50" : "",
        interactive || liftOnHover
          ? "transition-all duration-200 ease-out cursor-pointer"
          : "",
        interactive
          ? "hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:shadow-sm"
          : "",
        liftOnHover
          ? "hover:-translate-y-1 hover:shadow-lg"
          : "",
        ringOnHover
          ? "hover:border-primary/40"
          : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </div>
  );
}
