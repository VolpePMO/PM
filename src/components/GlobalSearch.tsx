import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const data = useQuery({
    queryKey: ["global-search"],
    enabled: open,
    queryFn: async () => {
      const [items, ideas, prds] = await Promise.all([
        supabase.from("backlog_items").select("id, title, description"),
        supabase.from("feedback_requests").select("id, title, description, backlog_item_id"),
        supabase.from("prds").select("backlog_item_id, content"),
      ]);
      if (items.error) throw items.error;
      if (ideas.error) throw ideas.error;
      if (prds.error) throw prds.error;
      return { items: items.data, ideas: ideas.data, prds: prds.data };
    },
  });

  const go = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  const itemTitle = (id: string) =>
    (data.data?.items ?? []).find((i) => i.id === id)?.title ?? "Item de backlog";

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput placeholder="Buscar itens, ideias e descrições…" />
      <CommandList>
        <CommandEmpty>Nenhum resultado.</CommandEmpty>
        <CommandGroup heading="Backlog">
          {(data.data?.items ?? []).map((i) => (
            <CommandItem
              key={i.id}
              value={`item ${i.title} ${i.description ?? ""}`}
              onSelect={() => go(() => void navigate({ to: "/backlog/$id", params: { id: i.id } }))}
            >
              {i.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Ideias">
          {(data.data?.ideas ?? []).map((i) => (
            <CommandItem
              key={i.id}
              value={`ideia ${i.title} ${i.description ?? ""}`}
              onSelect={() =>
                go(() =>
                  i.backlog_item_id
                    ? void navigate({ to: "/backlog/$id", params: { id: i.backlog_item_id } })
                    : void navigate({ to: "/ideias" }),
                )
              }
            >
              {i.title}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Descrições">
          {(data.data?.prds ?? []).map((p) => (
            <CommandItem
              key={p.backlog_item_id}
              value={`prd ${itemTitle(p.backlog_item_id)} ${p.content.slice(0, 2000)}`}
              onSelect={() =>
                go(() => void navigate({ to: "/backlog/$id", params: { id: p.backlog_item_id } }))
              }
            >
              Descrição · {itemTitle(p.backlog_item_id)}
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
