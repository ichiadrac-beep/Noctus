import type { ReactNode } from "react";
import { ChevronLeft, MoreVertical } from "lucide-react";

export function ScreenHead({
  title,
  kicker,
  onBack,
  onMenu,
}: {
  title: string;
  kicker: string;
  onBack?: () => void;
  onMenu?: () => void;
}) {
  return (
    <header className="flex items-start justify-between gap-3 pt-6 pb-2">
      <div className="flex min-w-0 items-start gap-2">
        {onBack ? (
          <button type="button" className="round-btn mt-0.5" aria-label="Back" onClick={onBack}>
            <ChevronLeft className="size-5" aria-hidden="true" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="display text-2xl text-fg">{title}</h1>
          <p className="eyebrow mt-1">{kicker}</p>
        </div>
      </div>
      {onMenu ? (
        <button type="button" className="round-btn" aria-label="Settings" onClick={onMenu}>
          <MoreVertical className="size-5" aria-hidden="true" />
        </button>
      ) : (
        <span className="size-9" />
      )}
    </header>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="seg" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          role="tab"
          aria-selected={value === option.id}
          data-on={value === option.id ? "true" : "false"}
          onClick={() => onChange(option.id)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function Panel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`panel p-4 ${className}`}>{children}</section>;
}

export function FieldLabel({ kicker, value }: { kicker: string; value: string }) {
  return (
    <span className="flex items-center justify-between gap-2">
      <span className="eyebrow">{kicker}</span>
      <span className="text-sm text-fg">{value}</span>
    </span>
  );
}
