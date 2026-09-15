import { cn } from "@/lib/utils";

/**
 * Marca do Valori PM: as barras em âmbar do Portal e o nome em verde escuro.
 * `compact` esconde o nome, para o estado recolhido do menu lateral.
 */
export function ValoriLogo({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 22 20"
        className="h-5 w-[22px] shrink-0"
        role="img"
        aria-label="Valori"
        fill="none"
      >
        <rect x="0" y="9" width="4" height="11" rx="1.2" fill="var(--gold)" />
        <rect x="6" y="5" width="4" height="15" rx="1.2" fill="var(--gold)" opacity="0.8" />
        <rect x="12" y="0" width="4" height="20" rx="1.2" fill="var(--gold)" />
        <rect x="18" y="12" width="4" height="8" rx="1.2" fill="var(--gold)" opacity="0.6" />
      </svg>
      {!compact && (
        <span className="text-[15px] font-semibold tracking-tight text-brand-dark">
          valori <span className="font-normal text-muted-foreground">PM</span>
        </span>
      )}
    </span>
  );
}
