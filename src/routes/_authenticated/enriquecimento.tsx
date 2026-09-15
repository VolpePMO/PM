import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  AlertCircle,
  CheckCircle2,
  Copy,
  ExternalLink,
  Loader2,
  Search,
  Stethoscope,
} from "lucide-react";
import { toast } from "sonner";
import {
  API_BASE,
  MCC_STATUS,
  PLACEHOLDERS,
  RECEITA_STATUS,
  TEMPLATE_NOME,
  camposFaltando,
  consultarMcc,
  consultarReceita,
  criarContrato,
  descreverMcc,
  diagnosticar,
  digitosVerificadoresOk,
  escolherMelhorMcc,
  explicar,
  maskCnpj,
  maskCpf,
  maskTelefone,
  montarEnderecoLinha,
  montarPayloadContrato,
  normalizarReceita,
  onlyAlnumUpper,
  type DadosEmpresa,
  type ValoresContrato,
} from "@/lib/enriquecimento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageHeader } from "@/components/PageHeader";

export const Route = createFileRoute("/_authenticated/enriquecimento")({
  head: () => ({
    meta: [
      { title: "Enriquecimento de cadastro — Valori PM" },
      {
        name: "description",
        content:
          "Prova de conceito: a partir do CNPJ, preenche os dados da Receita e o MCC da ABECS e gera o contrato para assinatura.",
      },
      { property: "og:title", content: "Enriquecimento de cadastro — Valori PM" },
      {
        property: "og:description",
        content:
          "Prova de conceito: a partir do CNPJ, preenche os dados da Receita e o MCC da ABECS e gera o contrato para assinatura.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: EnriquecimentoPage,
});

const EMPTY: DadosEmpresa = {
  dataAbertura: "",
  razaoSocial: "",
  nomeFantasia: "",
  porte: "",
  cnaeCodigo: "",
  cnaeDescricao: "",
  logradouro: "",
  numero: "",
  complemento: "",
  cep: "",
  bairro: "",
  municipio: "",
  uf: "",
  sugestaoEmail: "",
  sugestaoTelefone: "",
  sugestaoNome: "",
};

type Estado =
  | { tipo: "vazio" }
  | { tipo: "carregando"; texto: string }
  | { tipo: "ok"; texto: string }
  | { tipo: "erro"; texto: string };

const AUTO_TRIGGER_DELAY_MS = 450;

function EnriquecimentoPage() {
  const [cnpj, setCnpj] = useState("");
  const [dados, setDados] = useState<DadosEmpresa>(EMPTY);
  const [mcc, setMcc] = useState({ codigo: "", descricao: "", nota: "" });
  const [estado, setEstado] = useState<Estado>({ tipo: "vazio" });

  // Os quatro campos que a Receita não entrega de forma confiável.
  const [nomeTitular, setNomeTitular] = useState("");
  const [cpfTitular, setCpfTitular] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");

  const [enviarEmail, setEnviarEmail] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [payloadVisivel, setPayloadVisivel] = useState(false);
  const [resultado, setResultado] = useState<
    | { ok: true; link: string | null; nome: string; token: string }
    | { ok: false; texto: string }
    | null
  >(null);
  const [diagnostico, setDiagnostico] = useState<string | null>(null);

  const chars = onlyAlnumUpper(cnpj);
  const dvOk = digitosVerificadoresOk(chars);

  const valores: ValoresContrato = useMemo(
    () => ({
      razaoSocial: dados.razaoSocial,
      nomeFantasia: dados.nomeFantasia,
      cnpjFormatado: maskCnpj(chars),
      enderecoLinha: montarEnderecoLinha(dados),
      municipio: dados.municipio,
      uf: dados.uf.toUpperCase(),
      nomeTitular: nomeTitular.trim(),
      cpfTitular: maskCpf(cpfTitular),
      email: email.trim(),
      telefone: maskTelefone(telefone),
    }),
    [chars, dados, nomeTitular, cpfTitular, email, telefone],
  );

  const faltando = camposFaltando(valores);
  // Só vale apontar campo pendente depois que a consulta trouxe a empresa:
  // antes disso tudo está vazio e marcar todos de vermelho não informa nada.
  const consultou = dados.razaoSocial !== "";

  const consultar = useCallback(async (alvo: string) => {
    setResultado(null);
    setEstado({ tipo: "carregando", texto: "Consultando dados cadastrais…" });

    const receita = await consultarReceita(alvo);
    if (receita.httpStatus !== 200 || !receita.data) {
      setDados(EMPTY);
      setMcc({ codigo: "", descricao: "", nota: "" });
      setEstado({
        tipo: "erro",
        texto:
          receita.detalhe && receita.fonte === "backend"
            ? `Problema no serviço de consulta: ${receita.detalhe}`
            : explicar(RECEITA_STATUS, receita.httpStatus),
      });
      return;
    }

    const normalizados = normalizarReceita(receita.data);
    setDados(normalizados);
    setNomeTitular((atual) => atual || normalizados.sugestaoNome);
    setEmail((atual) => atual || normalizados.sugestaoEmail);
    setTelefone((atual) => atual || normalizados.sugestaoTelefone);

    setEstado({ tipo: "carregando", texto: "Dados encontrados. Consultando o MCC na ABECS…" });

    const resposta = await consultarMcc(alvo);
    if (resposta.httpStatus === 200 && Array.isArray(resposta.data)) {
      const escolhido = descreverMcc(escolherMelhorMcc(resposta.data));
      const total = resposta.data.length;
      setMcc({
        codigo: escolhido.codigo,
        descricao: escolhido.descricao,
        nota:
          total > 1
            ? `${total} MCCs ativos neste CNPJ; exibindo o principal.`
            : "MCC ativo na base da ABECS.",
      });
      setEstado({ tipo: "ok", texto: "Cadastro preenchido a partir da Receita e da ABECS." });
      return;
    }

    setMcc({ codigo: "", descricao: "", nota: explicar(MCC_STATUS, resposta.httpStatus) });
    setEstado({
      tipo: "ok",
      texto: "Dados cadastrais preenchidos. O MCC não veio — veja a observação no campo.",
    });
  }, []);

  // Dispara sozinho assim que o CNPJ fica completo e válido, como na página
  // original: o usuário digita e a ficha se preenche.
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (chars.length !== 14 || dvOk !== true) return;
    timer.current = setTimeout(() => void consultar(chars), AUTO_TRIGGER_DELAY_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [chars, dvOk, consultar]);

  function limpar() {
    setCnpj("");
    setDados(EMPTY);
    setMcc({ codigo: "", descricao: "", nota: "" });
    setNomeTitular("");
    setCpfTitular("");
    setEmail("");
    setTelefone("");
    setResultado(null);
    setPayloadVisivel(false);
    setEstado({ tipo: "vazio" });
  }

  const payload = useMemo(
    () =>
      montarPayloadContrato(valores, {
        cnpjChars: chars,
        mcc: mcc.codigo,
        cnae: dados.cnaeCodigo,
        enviarEmail,
      }),
    [valores, chars, mcc.codigo, dados.cnaeCodigo, enviarEmail],
  );

  async function gerarContrato() {
    if (faltando.length > 0) return;
    setGerando(true);
    setResultado(null);
    const resposta = await criarContrato(payload);
    setGerando(false);

    if (resposta.ok) {
      setResultado({
        ok: true,
        link: resposta.contrato.link_assinatura ?? null,
        nome: resposta.contrato.nome ?? "",
        token: resposta.contrato.doc_token ?? "",
      });
      toast.success("Contrato criado na ZapSign.");
      return;
    }

    setResultado({
      ok: false,
      texto:
        typeof resposta.detalhe === "string"
          ? resposta.detalhe
          : `HTTP ${resposta.status}: ${JSON.stringify(resposta.detalhe ?? {}, null, 2)}`,
    });
  }

  async function testarServico() {
    setDiagnostico("Consultando…");
    const { body } = await diagnosticar();
    setDiagnostico(JSON.stringify(body, null, 2));
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Enriquecimento de cadastro"
        badge={
          <Badge variant="outline" className="border-gold/50 text-xs font-normal text-gold">
            Prova de conceito
          </Badge>
        }
        subtitle="Digite o CNPJ: os dados cadastrais vêm da Receita Federal e o MCC da base da ABECS, na mesma consulta. No fim, o contrato é gerado na ZapSign a partir do modelo DOCTESTE."
      />

      {/* Identificação */}
      <Card className="p-5">
        <SectionTitle>Identificação</SectionTitle>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1 space-y-1.5">
            <Label htmlFor="cnpj">CNPJ</Label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="cnpj"
                value={maskCnpj(chars)}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                autoComplete="off"
                className="pl-9"
                aria-describedby="cnpj-hint"
              />
            </div>
            <p id="cnpj-hint" className="text-xs text-muted-foreground">
              {dvOk === false
                ? "Dígitos verificadores não conferem."
                : "Aceita CNPJ numérico ou alfanumérico, conforme a regra da Receita vigente desde 2026."}
            </p>
          </div>
          <Button type="button" variant="ghost" onClick={limpar}>
            Limpar
          </Button>
        </div>

        {estado.tipo !== "vazio" && (
          <div
            className={`mt-4 flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm ${
              estado.tipo === "erro"
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-border bg-muted text-muted-foreground"
            }`}
          >
            {estado.tipo === "carregando" && <Loader2 className="mt-0.5 size-4 animate-spin" />}
            {estado.tipo === "ok" && <CheckCircle2 className="mt-0.5 size-4 text-primary" />}
            {estado.tipo === "erro" && <AlertCircle className="mt-0.5 size-4" />}
            <span>{estado.texto}</span>
          </div>
        )}
      </Card>

      {/* Dados da empresa */}
      <Card className="p-5">
        <SectionTitle>Dados da empresa</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <ReadField label="Data de abertura" value={dados.dataAbertura} />
          <ReadField label="Porte" value={dados.porte} />
          <ReadField label="Nome empresarial (razão social)" value={dados.razaoSocial} full />
          <ReadField label="Nome fantasia" value={dados.nomeFantasia} full />
          <ReadField label="CNAE principal (código)" value={dados.cnaeCodigo} />
          <ReadField label="CNAE principal (descrição)" value={dados.cnaeDescricao} />
          <ReadField
            label="MCC (Merchant Category Code)"
            value={mcc.codigo ? `${mcc.codigo}${mcc.descricao ? ` — ${mcc.descricao}` : ""}` : ""}
            hint={mcc.nota}
            full
          />
        </div>
      </Card>

      {/* Endereço */}
      <Card className="p-5">
        <SectionTitle>Endereço completo</SectionTitle>
        <div className="mt-4 grid gap-4 sm:grid-cols-4">
          <ReadField label="Logradouro" value={dados.logradouro} className="sm:col-span-2" />
          <ReadField label="Número" value={dados.numero} />
          <ReadField label="Complemento" value={dados.complemento} />
          <ReadField label="Bairro/Distrito" value={dados.bairro} className="sm:col-span-2" />
          <ReadField label="CEP" value={dados.cep} />
          <ReadField label="UF" value={dados.uf} />
          <ReadField label="Município" value={dados.municipio} className="sm:col-span-2" />
        </div>
      </Card>

      {/* Signatário */}
      <Card className="p-5">
        <div className="flex flex-wrap items-center gap-2.5">
          <SectionTitle>Dados do signatário</SectionTitle>
          <Badge variant="outline" className="text-[10px] font-normal">
            Confirmação obrigatória
          </Badge>
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          O modelo exige quatro dados que a base da Receita não fornece de forma confiável. Nome,
          e-mail e telefone vêm pré-preenchidos quando a consulta os retorna; o CPF vem mascarado
          pela Receita e sempre precisa ser digitado. Os quatro são editáveis.
        </p>

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <EditField
            id="nomeTitular"
            label="Titular do cadastro / signatário"
            hint="Quem assina o contrato."
            value={nomeTitular}
            onChange={setNomeTitular}
            missing={consultou && faltando.some((p) => p.campo === "nomeTitular")}
          />
          <EditField
            id="cpfTitular"
            label="CPF do signatário"
            hint="A Receita devolve o CPF mascarado. Digite o número completo."
            value={maskCpf(cpfTitular)}
            onChange={(v) => setCpfTitular(maskCpf(v))}
            placeholder="000.000.000-00"
            maxLength={14}
            missing={consultou && faltando.some((p) => p.campo === "cpfTitular")}
          />
          <EditField
            id="email"
            label="E-mail"
            hint="Destino do link de assinatura."
            type="email"
            value={email}
            onChange={setEmail}
            missing={consultou && faltando.some((p) => p.campo === "email")}
          />
          <EditField
            id="telefone"
            label="Telefone"
            hint="Com DDD."
            value={maskTelefone(telefone)}
            onChange={(v) => setTelefone(maskTelefone(v))}
            placeholder="(00) 00000-0000"
            maxLength={16}
            missing={consultou && faltando.some((p) => p.campo === "telefone")}
          />
        </div>
      </Card>

      {/* Contrato */}
      <Card className="p-5">
        <SectionTitle>Geração do contrato</SectionTitle>

        <dl className="mt-4 grid gap-x-8 gap-y-1.5 text-sm sm:grid-cols-[auto_1fr]">
          <dt className="text-muted-foreground">Modelo na ZapSign</dt>
          <dd className="font-medium">{TEMPLATE_NOME}</dd>
          <dt className="text-muted-foreground">Serviço de integração</dt>
          <dd className="break-all font-medium">{API_BASE}</dd>
        </dl>

        <label className="mt-4 flex items-start gap-2.5 text-sm">
          <Checkbox
            checked={enviarEmail}
            onCheckedChange={(v) => setEnviarEmail(v === true)}
            className="mt-0.5"
          />
          <span className="text-muted-foreground">
            Enviar e-mail automático da ZapSign ao signatário com o link de assinatura
          </span>
        </label>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={gerarContrato} disabled={faltando.length > 0 || gerando}>
            {gerando && <Loader2 className="size-4 animate-spin" />}
            {!consultou
              ? "Gerar contrato para assinatura"
              : faltando.length > 0
                ? `Gerar contrato (${faltando.length} campo(s) pendente(s))`
                : "Gerar contrato para assinatura"}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setPayloadVisivel((v) => !v)}>
            {payloadVisivel ? "Ocultar payload" : "Ver payload"}
          </Button>
          <Button type="button" variant="ghost" onClick={testarServico}>
            <Stethoscope className="size-4" />
            Testar serviço
          </Button>
        </div>

        {consultou && faltando.length > 0 && (
          <p className="mt-3 text-xs text-muted-foreground">
            Pendentes: {faltando.map((p) => p.de).join(", ")}
          </p>
        )}

        {resultado?.ok === true && (
          <div className="mt-4 rounded-lg border border-primary/30 bg-primary/5 p-4 text-sm">
            <p className="font-medium text-primary">Contrato criado na ZapSign.</p>
            {resultado.nome && <p className="mt-1 text-muted-foreground">{resultado.nome}</p>}
            {resultado.link && (
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded-md bg-card px-2.5 py-1.5 text-xs">
                  {resultado.link}
                </code>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(resultado.link!);
                    toast.success("Link copiado.");
                  }}
                >
                  <Copy className="size-3.5" />
                  Copiar
                </Button>
                <Button type="button" size="sm" variant="outline" asChild>
                  <a href={resultado.link} target="_blank" rel="noreferrer">
                    <ExternalLink className="size-3.5" />
                    Abrir
                  </a>
                </Button>
              </div>
            )}
          </div>
        )}

        {resultado?.ok === false && (
          <pre className="mt-4 overflow-auto rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-xs text-destructive">
            {resultado.texto}
          </pre>
        )}

        {payloadVisivel && (
          <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-border bg-muted p-4 text-xs">
            {JSON.stringify(payload, null, 2)}
          </pre>
        )}

        {diagnostico && (
          <pre className="mt-4 max-h-80 overflow-auto rounded-lg border border-border bg-muted p-4 text-xs">
            {diagnostico}
          </pre>
        )}
      </Card>

      <Accordion type="single" collapsible>
        <AccordionItem value="legenda" className="rounded-xl border border-border bg-card px-5">
          <AccordionTrigger className="text-sm font-medium">
            Como esta prova de conceito funciona
          </AccordionTrigger>
          <AccordionContent className="space-y-5 pb-5 text-sm text-muted-foreground">
            <p className="leading-relaxed">
              A tela não fala direto com as APIs externas. Um serviço próprio faz a ponte, por dois
              motivos que não mudam: nem a API MCC Central nem a da ZapSign liberam CORS para
              origens externas, e as credenciais dessas contas não podem ficar no JavaScript da
              página, onde qualquer visitante as leria. O mesmo serviço também guarda em cache as
              consultas de CNPJ, já que o plano público da base cadastral permite poucas por minuto.
            </p>

            <div>
              <p className="font-medium text-foreground">Variáveis enviadas ao modelo</p>
              <table className="mt-2 w-full text-xs">
                <thead>
                  <tr className="border-b border-border text-[11px] uppercase tracking-wide">
                    <th className="py-1.5 text-left font-medium">Variável</th>
                    <th className="py-1.5 text-left font-medium">De onde vem</th>
                  </tr>
                </thead>
                <tbody>
                  {PLACEHOLDERS.map((p) => (
                    <tr key={p.de} className="border-b border-border last:border-0">
                      <td className="py-1.5 pr-4">
                        <code>{p.de}</code>
                      </td>
                      <td className="py-1.5">{p.origem}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-brand-dark">{children}</p>;
}

function ReadField({
  label,
  value,
  hint,
  full,
  className,
}: {
  label: string;
  value: string;
  hint?: string;
  full?: boolean;
  className?: string;
}) {
  return (
    <div className={[full ? "sm:col-span-2" : "", className ?? ""].join(" ")}>
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 min-h-[1.5rem] border-b border-border pb-1.5 text-sm">
        {value || <span className="text-muted-foreground/60">—</span>}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

function EditField({
  id,
  label,
  hint,
  value,
  onChange,
  placeholder,
  maxLength,
  type = "text",
  missing,
}: {
  id: string;
  label: string;
  hint: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  type?: string;
  missing?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        className={missing ? "border-gold" : undefined}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}
