/**
 * Prova de conceito de enriquecimento de cadastro.
 *
 * A partir de um CNPJ, busca os dados cadastrais na Receita Federal e o MCC na
 * base da ABECS, preenche a ficha e gera o contrato para assinatura na ZapSign.
 *
 * O trabalho de rede fica num backend próprio (o serviço FastAPI já publicado),
 * por dois motivos que não mudam: nem a API da ABECS nem a da ZapSign liberam
 * CORS para origens externas, e as credenciais dessas contas não podem viver no
 * JavaScript da página, onde qualquer visitante as leria no DevTools.
 *
 * Este arquivo tem só funções puras e o cliente HTTP — nada de React — para que
 * as regras (máscaras, dígitos verificadores, escolha do MCC, montagem do
 * payload) possam ser testadas sem montar a tela.
 */

export const API_BASE = (
  import.meta.env["VITE_ENRIQUECIMENTO_API_URL"] ?? "https://abecsisbad.onrender.com"
).replace(/\/$/, "");

export const TEMPLATE_NOME = "DOCTESTE";

// ---------------------------------------------------------------------------
// Máscaras e normalização
// ---------------------------------------------------------------------------

export function onlyAlnumUpper(v: string | null | undefined): string {
  return (v ?? "").toUpperCase().replace(/[^0-9A-Z]/g, "");
}

export function onlyDigits(v: string | null | undefined): string {
  return (v ?? "").replace(/\D/g, "");
}

export function maskCnpj(chars: string): string {
  const p = onlyAlnumUpper(chars).slice(0, 14);
  let out = "";
  if (p.length > 0) out = p.substring(0, 2);
  if (p.length > 2) out += "." + p.substring(2, 5);
  if (p.length > 5) out += "." + p.substring(5, 8);
  if (p.length > 8) out += "/" + p.substring(8, 12);
  if (p.length > 12) out += "-" + p.substring(12, 14);
  return out;
}

export function maskCpf(v: string): string {
  const d = onlyDigits(v).slice(0, 11);
  let out = "";
  if (d.length > 0) out = d.substring(0, 3);
  if (d.length > 3) out += "." + d.substring(3, 6);
  if (d.length > 6) out += "." + d.substring(6, 9);
  if (d.length > 9) out += "-" + d.substring(9, 11);
  return out;
}

export function maskTelefone(v: string): string {
  let d = onlyDigits(v);
  // Número colado com o código do país: 55 + DDD + 9 dígitos passa de 11.
  if (d.length > 11 && d.startsWith("55")) d = d.substring(2);
  d = d.slice(0, 11);
  if (d.length <= 2) return d.length ? "(" + d : "";
  if (d.length <= 6) return "(" + d.substring(0, 2) + ") " + d.substring(2);
  if (d.length <= 10)
    return "(" + d.substring(0, 2) + ") " + d.substring(2, 6) + "-" + d.substring(6);
  return "(" + d.substring(0, 2) + ") " + d.substring(2, 7) + "-" + d.substring(7);
}

export function maskCep(v: string): string {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return d.substring(0, 5) + "-" + d.substring(5);
}

export function formatDateBr(iso: string | null | undefined): string {
  if (!iso) return "";
  const parts = iso.split("-");
  if (parts.length !== 3) return iso;
  return `${parts[2]!.substring(0, 2)}/${parts[1]}/${parts[0]}`;
}

// ---------------------------------------------------------------------------
// CNPJ alfanumérico
//
// Desde 2026 os doze primeiros caracteres podem ser letras ou números; os dois
// dígitos verificadores continuam numéricos. O valor de cada caractere é o
// código ASCII menos 48, que devolve 0-9 para dígitos e 17+ para letras.
// ---------------------------------------------------------------------------

function valorCaractere(c: string): number {
  return c.charCodeAt(0) - 48;
}

function digitoVerificador(valores: number[], pesos: number[]): number {
  const soma = valores.reduce((acc, v, i) => acc + v * (pesos[i] ?? 0), 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** `null` quando ainda não há 14 caracteres (o usuário está digitando). */
export function digitosVerificadoresOk(chars: string): boolean | null {
  if (chars.length !== 14) return null;
  if (!/^[0-9A-Z]{12}[0-9]{2}$/.test(chars)) return false;
  const base = chars.substring(0, 12).split("").map(valorCaractere);
  const dv1 = digitoVerificador(base, [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const dv2 = digitoVerificador([...base, dv1], [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return valorCaractere(chars[12]!) === dv1 && valorCaractere(chars[13]!) === dv2;
}

// ---------------------------------------------------------------------------
// Dados da Receita
// ---------------------------------------------------------------------------

export type DadosEmpresa = {
  dataAbertura: string;
  razaoSocial: string;
  nomeFantasia: string;
  porte: string;
  cnaeCodigo: string;
  cnaeDescricao: string;
  logradouro: string;
  numero: string;
  complemento: string;
  cep: string;
  bairro: string;
  municipio: string;
  uf: string;
  /** Sugestões para os campos do signatário, quando a Receita as devolve. */
  sugestaoEmail: string;
  sugestaoTelefone: string;
  sugestaoNome: string;
};

/** A resposta da base cadastral é JSON livre: campos aparecem e somem conforme
 *  o CNPJ. Em vez de tipar tudo, lemos com dois auxiliares que nunca explodem. */
export type ReceitaRaw = Record<string, unknown>;

function obj(v: unknown): ReceitaRaw {
  return v !== null && typeof v === "object" ? (v as ReceitaRaw) : {};
}

function str(v: unknown): string {
  return typeof v === "string" ? v : v === null || v === undefined ? "" : String(v);
}

type Socio = { nome?: string; qualificacao?: string; qualificacao_socio?: { descricao?: string } };

/** Sócio mais provável como signatário: prioriza quem tem "administrador" na
 *  qualificação e, na falta disso, o primeiro da lista. */
export function escolherSocio(socios: unknown): Socio | null {
  if (!Array.isArray(socios) || socios.length === 0) return null;
  const lista = socios as Socio[];
  const admin = lista.filter((s) =>
    ((s.qualificacao_socio?.descricao ?? s.qualificacao ?? "") as string)
      .toLowerCase()
      .includes("administrador"),
  );
  return admin[0] ?? lista[0] ?? null;
}

export function normalizarReceita(raw: ReceitaRaw): DadosEmpresa {
  const est = obj(raw["estabelecimento"]);
  const atividade = obj(est["atividade_principal"]);
  const logradouro = [str(est["tipo_logradouro"]), str(est["logradouro"])]
    .filter(Boolean)
    .join(" ")
    .trim();
  const telefone = est["telefone1"] ? maskTelefone(str(est["ddd1"]) + str(est["telefone1"])) : "";
  const socio = escolherSocio(raw["socios"]);

  return {
    dataAbertura: formatDateBr(str(est["data_inicio_atividade"])),
    razaoSocial: str(raw["razao_social"]),
    nomeFantasia: str(est["nome_fantasia"]),
    porte: str(obj(raw["porte"])["descricao"]),
    cnaeCodigo: str(atividade["subclasse"]),
    cnaeDescricao: str(atividade["descricao"]),
    logradouro,
    numero: str(est["numero"]),
    complemento: str(est["complemento"]),
    cep: maskCep(str(est["cep"])),
    bairro: str(est["bairro"]),
    municipio: str(obj(est["cidade"])["nome"]),
    uf: str(obj(est["estado"])["sigla"]),
    sugestaoEmail: str(est["email"]),
    sugestaoTelefone: telefone,
    sugestaoNome: socio?.nome ?? "",
  };
}

// ---------------------------------------------------------------------------
// MCC
// ---------------------------------------------------------------------------

type MccItem = Record<string, unknown>;

function leMcc(item: MccItem): string {
  return String(item["mcc"] ?? item["Mcc"] ?? item["MCC"] ?? "");
}

function leOrdem(item: MccItem): number {
  const bruto = item["ordemMcc"] ?? item["OrdemMcc"];
  return typeof bruto === "number" ? bruto : 99;
}

/** O CNPJ pode ter mais de um MCC ativo. Descarta os códigos de preenchimento
 *  ("0000", "XXXX") e fica com o de menor ordem, que é o principal. */
export function escolherMelhorMcc(lista: unknown): MccItem | null {
  if (!Array.isArray(lista) || lista.length === 0) return null;
  const itens = lista as MccItem[];
  const validos = itens.filter((item) => {
    const mcc = leMcc(item);
    return mcc !== "" && mcc !== "0000" && mcc !== "XXXX";
  });
  const pool = validos.length > 0 ? validos : itens;
  return [...pool].sort((a, b) => leOrdem(a) - leOrdem(b))[0] ?? null;
}

export function descreverMcc(item: MccItem | null): { codigo: string; descricao: string } {
  if (!item) return { codigo: "", descricao: "" };
  const descricao = String(
    item["descricao"] ?? item["Descricao"] ?? item["descricaoMcc"] ?? item["DescricaoMcc"] ?? "",
  );
  return { codigo: leMcc(item), descricao };
}

// ---------------------------------------------------------------------------
// Contrato
// ---------------------------------------------------------------------------

/** Variáveis do modelo DOCTESTE na ZapSign. As chaves precisam bater caractere
 *  a caractere com o .docx, incluindo caixa e acentos. */
export const PLACEHOLDERS = [
  { de: "{{razao cliente}}", campo: "razaoSocial", origem: "Receita, razao_social" },
  { de: "{{fantasia cliente}}", campo: "nomeFantasia", origem: "Receita, nome_fantasia" },
  { de: "{{CNPJ cliente}}", campo: "cnpjFormatado", origem: "CNPJ digitado, com máscara" },
  {
    de: "{{endereço cliente}}",
    campo: "enderecoLinha",
    origem: "Receita, logradouro + número + bairro + CEP",
  },
  { de: "{{cidade cliente}}", campo: "municipio", origem: "Receita, cidade" },
  { de: "{{UF cliente}}", campo: "uf", origem: "Receita, estado" },
  { de: "{{nome cliente}}", campo: "nomeTitular", origem: "Sócio administrador, ou digitado" },
  { de: "{{CPF cliente}}", campo: "cpfTitular", origem: "Digitado, a Receita mascara o CPF" },
  { de: "{{email cliente}}", campo: "email", origem: "Receita quando disponível, ou digitado" },
  {
    de: "{{telefone cliente}}",
    campo: "telefone",
    origem: "Receita quando disponível, ou digitado",
  },
] as const;

export type PlaceholderCampo = (typeof PLACEHOLDERS)[number]["campo"];

export type ValoresContrato = Record<PlaceholderCampo, string>;

export function montarEnderecoLinha(d: {
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cep: string;
}): string {
  const partes: string[] = [];
  if (d.logradouro) partes.push(d.numero ? `${d.logradouro}, ${d.numero}` : d.logradouro);
  else if (d.numero) partes.push(d.numero);
  if (d.complemento) partes.push(d.complemento);
  if (d.bairro) partes.push(d.bairro);
  if (d.cep) partes.push(`CEP ${maskCep(d.cep)}`);
  return partes.join(", ");
}

/** Placeholders que sairiam em branco — o PDF ficaria com o marcador cru, então
 *  o botão de gerar fica travado enquanto a lista não esvazia. */
export function camposFaltando(valores: ValoresContrato) {
  return PLACEHOLDERS.filter((p) => !(valores[p.campo] ?? "").trim());
}

export function montarPayloadContrato(
  valores: ValoresContrato,
  extras: { cnpjChars: string; mcc: string; cnae: string; enviarEmail: boolean },
) {
  return {
    template_nome: TEMPLATE_NOME,
    signer_name: valores.nomeTitular,
    signer_email: valores.email,
    signer_phone_country: "55",
    signer_phone_number: onlyDigits(valores.telefone),
    name: `Termo de Condições Comerciais, ${valores.razaoSocial}`,
    lang: "pt-br",
    external_id: extras.cnpjChars,
    send_automatic_email: extras.enviarEmail,
    folder_path: "/termos-comerciais/",
    metadata: [
      { key: "cnpj", value: extras.cnpjChars },
      { key: "mcc", value: extras.mcc },
      { key: "cnae", value: extras.cnae },
      { key: "origem", value: "valori-pm-enriquecimento" },
    ],
    data: PLACEHOLDERS.map((p) => ({ de: p.de, para: valores[p.campo] ?? "" })),
  };
}

// ---------------------------------------------------------------------------
// Cliente do backend
// ---------------------------------------------------------------------------

export type Envelope<T = unknown> = {
  httpStatus: number;
  fonte?: string;
  detalhe?: string;
  statusMeaning?: string;
  doCache?: boolean;
  data?: T;
};

const SEM_REDE: Envelope = {
  httpStatus: 0,
  fonte: "backend",
  detalhe: "Não foi possível falar com o serviço de consulta.",
};

async function pegarEnvelope<T>(rota: string): Promise<Envelope<T>> {
  try {
    const resp = await fetch(`${API_BASE}${rota}`, { headers: { Accept: "application/json" } });
    return (await resp.json()) as Envelope<T>;
  } catch {
    return SEM_REDE as Envelope<T>;
  }
}

const COLD_START = [0, 502, 503];
const RETRY_DELAY_MS = 4000;

/** O serviço hiberna no plano gratuito, e a primeira chamada depois disso pode
 *  falhar ou demorar. Uma retentativa resolve, em vez de mostrar erro de cara. */
async function comRetentativa<T>(rota: string): Promise<Envelope<T>> {
  const primeiro = await pegarEnvelope<T>(rota);
  if (!COLD_START.includes(primeiro.httpStatus)) return primeiro;
  await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
  return pegarEnvelope<T>(rota);
}

export function consultarReceita(cnpjChars: string) {
  return comRetentativa<ReceitaRaw>(`/cnpj/${cnpjChars}`);
}

export function consultarMcc(cnpjChars: string) {
  return comRetentativa<unknown[]>(`/mcc/${cnpjChars}`);
}

export type ContratoCriado = {
  doc_token?: string;
  template_id?: string;
  status?: string;
  nome?: string;
  link_assinatura?: string | null;
  variaveis_aplicadas?: unknown;
};

export type RespostaContrato =
  { ok: true; contrato: ContratoCriado } | { ok: false; status: number; detalhe: unknown };

export async function criarContrato(payload: unknown): Promise<RespostaContrato> {
  try {
    const resp = await fetch(`${API_BASE}/contrato`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    const body: unknown = await resp.json().catch(() => null);
    if (resp.ok) return { ok: true, contrato: obj(body) as ContratoCriado };
    return { ok: false, status: resp.status, detalhe: obj(body)["detail"] ?? body };
  } catch (erro) {
    return { ok: false, status: 0, detalhe: erro instanceof Error ? erro.message : String(erro) };
  }
}

export async function diagnosticar(): Promise<{ ok: boolean; body: unknown }> {
  try {
    const resp = await fetch(`${API_BASE}/health`, { headers: { Accept: "application/json" } });
    return { ok: resp.ok, body: await resp.json() };
  } catch (erro) {
    return { ok: false, body: { erro: erro instanceof Error ? erro.message : String(erro) } };
  }
}

// ---------------------------------------------------------------------------
// Mensagens de status, para a tela explicar o retorno em vez de só mostrar
// o número.
// ---------------------------------------------------------------------------

export const RECEITA_STATUS: Record<number, string> = {
  0: "Não foi possível falar com o serviço de consulta.",
  200: "Dados cadastrais encontrados e retornados pela Receita Federal.",
  400: "O CNPJ enviado está em um formato que a API não reconhece.",
  404: "Nenhum CNPJ com este número na base da Receita, ou registro ainda não indexado (comum em CNPJ alfanumérico recém-emitido).",
  429: "Limite de consultas por minuto atingido. Aguarde um minuto e tente de novo.",
  500: "Erro interno no servidor da API de dados cadastrais.",
  502: "A API teve problema ao falar com a base da Receita Federal.",
  503: "A API está temporariamente fora do ar.",
  504: "A API demorou demais para responder.",
};

export const MCC_STATUS: Record<number, string> = {
  0: "Não foi possível conectar ao serviço que consulta o MCC.",
  200: "MCC(s) ativo(s) atribuído(s) a este CNPJ retornado(s) com sucesso.",
  400: "O CNPJ não está no formato de 14 caracteres esperado pela API MCC Central.",
  401: "Falha de autenticação na API MCC Central. É a credencial do serviço, não o CNPJ digitado.",
  404: "Nenhum MCC ativo atribuído a este CNPJ na base da ABECS.",
  429: "Limite de solicitações à API MCC Central atingido.",
  500: "Erro interno no servidor da API MCC Central.",
  502: "Erro de integração com a API MCC Central (ou o serviço estava hibernando).",
  504: "Tempo esgotado antes de a API MCC Central responder.",
  599: "Problema de configuração ou de rede no serviço de consulta, não na ABECS.",
};

export function explicar(tabela: Record<number, string>, codigo: number): string {
  return tabela[codigo] ?? "Código não mapeado.";
}
