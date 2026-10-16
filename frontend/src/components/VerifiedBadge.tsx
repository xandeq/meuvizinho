"use client";

interface VerifiedBadgeProps {
  verified: boolean;
  size?: "sm" | "md";
  /** Só o ✓ (ao lado do nome, em cards). O texto quebrava em 2 linhas no card do Mercado. */
  compact?: boolean;
}

export default function VerifiedBadge({ verified, size = "md", compact = false }: VerifiedBadgeProps) {
  if (!verified) return null;

  if (compact) {
    return (
      <svg role="img" aria-label="Vizinho verificado" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-secondary">
        <title>Vizinho verificado</title>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
    );
  }

  const sizeClasses =
    size === "sm"
      ? "text-xs px-2 py-0.5 gap-1"
      : "text-sm px-3 py-1 gap-1.5";

  return (
    <span
      className={`inline-flex items-center whitespace-nowrap rounded-full bg-secondary-light text-secondary font-semibold ${sizeClasses}`}
      aria-label="Vizinho verificado"
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className={size === "sm" ? "h-3 w-3" : "h-4 w-4"}
      >
        <path
          fillRule="evenodd"
          d="M16.704 5.29a1 1 0 010 1.42l-7.5 7.5a1 1 0 01-1.42 0l-3.5-3.5a1 1 0 011.42-1.42l2.79 2.79 6.79-6.79a1 1 0 011.42 0z"
          clipRule="evenodd"
        />
      </svg>
      Vizinho verificado
    </span>
  );
}
