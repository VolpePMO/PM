import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ValoriLogo } from "@/components/ValoriLogo";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar — Valori PM" },
      {
        name: "description",
        content: "Acesso interno à ferramenta de gestão de produto da Valori Tech.",
      },
      { property: "og:title", content: "Entrar — Valori PM" },
      {
        property: "og:description",
        content: "Acesso interno à ferramenta de gestão de produto da Valori Tech.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    void navigate({ to: "/dashboard" });
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForgotSent(true);
  }

  return (
    <div className="grid min-h-screen bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      {/* Painel da marca: some no celular, onde o formulário é o que importa. */}
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-portal-dark p-12 text-white lg:flex">
        <div className="flex items-center gap-2.5">
          <svg
            viewBox="0 0 22 20"
            className="h-6 w-[26px]"
            role="img"
            aria-label="Valori"
            fill="none"
          >
            <rect x="0" y="9" width="4" height="11" rx="1.2" fill="var(--gold)" />
            <rect x="6" y="5" width="4" height="15" rx="1.2" fill="var(--gold)" opacity="0.8" />
            <rect x="12" y="0" width="4" height="20" rx="1.2" fill="var(--gold)" />
            <rect x="18" y="12" width="4" height="8" rx="1.2" fill="var(--gold)" opacity="0.6" />
          </svg>
          <span className="text-lg font-semibold tracking-tight">
            valori <span className="font-normal text-white/70">PM</span>
          </span>
        </div>

        <div className="max-w-md">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            O trabalho de produto da Valori, em um lugar só.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-white/70">
            Backlog priorizado, roadmap, esteira de onboarding, indicadores e as provas de conceito
            em andamento — tudo sob o mesmo teto.
          </p>
        </div>

        <p className="text-xs text-white/50">© {new Date().getFullYear()} Valori Tech</p>

        {/* Textura discreta, só para o painel não ficar chapado. */}
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-gold/10 blur-3xl"
        />
      </aside>

      <main className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden">
            <ValoriLogo />
          </div>

          <h2 className="mt-8 text-2xl font-semibold tracking-tight text-brand-dark lg:mt-0">
            {forgotMode ? "Redefinir senha" : "Entrar"}
          </h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {forgotMode
              ? "Informe o e-mail da sua conta e enviamos um link de redefinição."
              : "Use o e-mail e a senha da sua conta Valori."}
          </p>

          <div className="mt-8">
            {forgotMode ? (
              forgotSent ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Se existir uma conta com esse e-mail, enviamos um link de redefinição. Verifique
                    sua caixa de entrada (e o spam).
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setForgotMode(false)}>
                    Voltar para o login
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleForgot} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgot-email">E-mail</Label>
                    <Input
                      id="forgot-email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="seu@email.com"
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Enviando..." : "Enviar link de redefinição"}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setForgotMode(false)}
                    className="w-full text-sm text-muted-foreground transition-colors hover:text-primary"
                  >
                    Voltar para o login
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={signIn} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="-mt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotMode(true);
                      setForgotSent(false);
                    }}
                    className="text-sm font-medium text-primary underline underline-offset-4 transition-opacity hover:opacity-80"
                  >
                    Esqueceu sua senha?
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  Entrar
                </Button>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  O cadastro é feito apenas por administradores. Se você não tem acesso, fale com o
                  time de produto.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
