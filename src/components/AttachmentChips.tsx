import { Paperclip, X } from "lucide-react";

export function formatBytes(bytes: number | null | undefined) {
  if (!bytes && bytes !== 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type ChipFile = {
  id: string;
  file_name: string;
  size_bytes?: number | null;
};

/**
 * Chips compactos de anexo.
 * Sem arquivos → não renderiza nada (nem rótulo, nem divisor).
 * Rótulo discreto só aparece com mais de um arquivo.
 */
export function AttachmentChips({
  files,
  onOpen,
  onRemove,
  label = "Anexos",
}: {
  files: ChipFile[];
  onOpen?: (file: ChipFile) => void;
  onRemove?: (file: ChipFile) => void;
  label?: string;
}) {
  if (files.length === 0) return null;
  return (
    <div className="space-y-1">
      {files.length > 1 && (
        <p className="text-xs uppercase tracking-wide text-muted-foreground/70">{label}</p>
      )}
      <div className="flex flex-wrap gap-2">
        {files.map((f) => {
          const size = formatBytes(f.size_bytes);
          return (
            <span
              key={f.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-md border bg-muted/60 px-2 py-1 text-xs"
            >
              <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
              <button
                type="button"
                className="max-w-52 truncate text-left hover:underline"
                title={f.file_name}
                onClick={() => onOpen?.(f)}
              >
                {f.file_name}
              </button>
              {size && <span className="shrink-0 text-muted-foreground/70">{size}</span>}
              {onRemove && (
                <button
                  type="button"
                  aria-label={`Remover ${f.file_name}`}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                  onClick={() => onRemove(f)}
                >
                  <X className="h-3 w-3" aria-hidden />
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
