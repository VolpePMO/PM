import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { initials } from "@/lib/domain";
import { cn } from "@/lib/utils";

export function useAvatarUrl(path: string | null | undefined) {
  return useQuery({
    queryKey: ["avatar-url", path],
    enabled: !!path,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from("avatars")
        .createSignedUrl(path!, 60 * 60);
      if (error) return null;
      return data.signedUrl;
    },
  });
}

export function UserAvatar({
  name,
  path,
  className,
}: {
  name: string | null | undefined;
  path: string | null | undefined;
  className?: string;
}) {
  const { data: url } = useAvatarUrl(path);
  return (
    <Avatar className={cn("h-8 w-8", className)}>
      {url && <AvatarImage src={url} alt={name ?? "Avatar"} />}
      <AvatarFallback className="bg-gold text-xs font-semibold text-gold-foreground">
        {initials(name)}
      </AvatarFallback>
    </Avatar>
  );
}
