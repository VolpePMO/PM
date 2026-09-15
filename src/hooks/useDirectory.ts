import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDirectory } from "@/lib/directory.functions";

/** Lista de pessoas ativas (nome e foto) para menções e responsáveis. */
export function useDirectory() {
  const fetchDirectory = useServerFn(getDirectory);
  const query = useQuery({
    queryKey: ["directory"],
    staleTime: 5 * 60_000,
    queryFn: () => fetchDirectory(),
  });
  const people = query.data ?? [];
  const nameOf = (id: string | null | undefined) =>
    people.find((p) => p.id === id)?.display_name ?? null;
  return { people, nameOf, isLoading: query.isLoading };
}
