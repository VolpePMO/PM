import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Registration = { hasText: () => boolean; reset: () => void };

type Ctx = {
  open: string | null;
  register: (key: string, reg: Registration) => void;
  requestOpen: (key: string) => void;
  requestClose: (key: string, force?: boolean) => void;
};

const InlineFormCtx = createContext<Ctx | null>(null);

/** Garante que apenas um formulário inline fique expandido por vez na página. */
export function InlineFormProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState<string | null>(null);
  const regs = useRef<Record<string, Registration>>({});

  const register = useCallback((key: string, reg: Registration) => {
    regs.current[key] = reg;
  }, []);

  const discardable = useCallback((key: string | null) => {
    if (!key) return true;
    const reg = regs.current[key];
    if (reg?.hasText() && !window.confirm("Descartar o texto digitado?")) return false;
    reg?.reset();
    return true;
  }, []);

  const requestOpen = useCallback(
    (key: string) => {
      setOpen((current) => {
        if (current === key) return current;
        if (!discardable(current)) return current;
        return key;
      });
    },
    [discardable],
  );

  const requestClose = useCallback(
    (key: string, force?: boolean) => {
      setOpen((current) => {
        if (current !== key) return current;
        if (!force && !discardable(key)) return current;
        if (force) regs.current[key]?.reset();
        return null;
      });
    },
    [discardable],
  );

  const value = useMemo(
    () => ({ open, register, requestOpen, requestClose }),
    [open, register, requestOpen, requestClose],
  );
  return <InlineFormCtx.Provider value={value}>{children}</InlineFormCtx.Provider>;
}

export function useInlineForm(key: string, reg: Registration) {
  const ctx = useContext(InlineFormCtx);
  ctx?.register(key, reg);
  return {
    isOpen: ctx?.open === key,
    open: () => ctx?.requestOpen(key),
    close: (force?: boolean) => ctx?.requestClose(key, force),
  };
}

/** Gatilho discreto que abre um formulário inline. */
export function InlineFormTrigger({
  label,
  onClick,
  icon,
  className,
}: {
  label: string;
  onClick: () => void;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      onClick={onClick}
      className={cn(
        "h-9 justify-start gap-2 px-2 text-sm text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      {icon ?? <Plus className="h-4 w-4" aria-hidden />}
      {label}
    </Button>
  );
}

/** Envolve o formulário expandido com transição suave de altura (~150ms). */
export function InlineFormShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-rows-[1fr] transition-all duration-150 ease-out", className)}>
      <div className="overflow-hidden">{children}</div>
    </div>
  );
}
