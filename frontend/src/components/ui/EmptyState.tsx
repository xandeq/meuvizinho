import { ReactNode } from "react";
import Button from "./Button";

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-5 py-20 px-6 text-center animate-fade-up">
      <div
        aria-hidden
        className="w-16 h-16 rounded-2xl bg-primary-light border border-primary-mid/30 flex items-center justify-center"
      >
        {icon ?? <DefaultIcon />}
      </div>

      <div className="max-w-[260px] space-y-1.5">
        <p className="text-base font-semibold text-fg">{title}</p>
        {description && (
          <p className="text-sm text-muted-fg leading-relaxed">{description}</p>
        )}
      </div>

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row items-center gap-2">
          {action && (
            <Button variant="primary" size="md" onClick={action.onClick}>
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="ghost" size="md" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function DefaultIcon() {
  return (
    <svg
      className="w-8 h-8 text-primary"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7Z" />
      <circle cx="12" cy="9" r="2.5" />
    </svg>
  );
}
