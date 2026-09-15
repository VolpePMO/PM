import { useDirectory } from "@/hooks/useDirectory";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  value: string | null;
  onChange: (value: string | null) => void;
  className?: string;
  disabled?: boolean;
};

/** Seleção de responsável (owner) a partir do diretório de pessoas ativas. */
export function OwnerSelect({ value, onChange, className, disabled }: Props) {
  const { people } = useDirectory();
  return (
    <Select
      disabled={disabled ?? false}
      value={value ?? "none"}
      onValueChange={(v) => onChange(v === "none" ? null : v)}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder="Sem responsável" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="none">Sem responsável</SelectItem>
        {people.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.display_name ?? "Usuário"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
