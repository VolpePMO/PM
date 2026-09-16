export type KeyResultLike = {
  start_value: number;
  current_value: number;
  target_value: number;
};

/** Progresso de um key result em % (0-100), relativo ao intervalo inicio -> meta. */
export function keyResultProgress(kr: KeyResultLike): number {
  const span = kr.target_value - kr.start_value;
  if (span === 0) return kr.current_value >= kr.target_value ? 100 : 0;
  const ratio = (kr.current_value - kr.start_value) / span;
  return Math.round(Math.min(1, Math.max(0, ratio)) * 100);
}

/** Progresso do objetivo = média simples do progresso dos key results. */
export function objectiveProgress(krs: KeyResultLike[]): number {
  if (krs.length === 0) return 0;
  const total = krs.reduce((sum, kr) => sum + keyResultProgress(kr), 0);
  return Math.round(total / krs.length);
}

export const TYPE_LABELS: Record<string, string> = {
  feature: "Feature",
  qol: "Melhoria QoL",
  bug: "Bug",
  produto: "Produto",
  teste: "Teste",
  debito_tecnico: "Débito técnico",
  compliance: "Compliance/Regulatório",
  seguranca: "Segurança",
  discovery: "Pesquisa/Discovery",
  infra: "Infra",
  operacional: "Operacional",
};

export const STATUS_LABELS: Record<string, string> = {
  ideia: "Ideia",
  planejado: "Planejado",
  em_desenvolvimento: "Em desenvolvimento",
  concluido: "Concluído",
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  muito_simples: "Muito Simples",
  simples: "Simples",
  moderado: "Moderado",
  complexo: "Complexo",
  muito_complexo: "Muito Complexo",
};

export const FEEDBACK_STATUS_LABELS: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em análise",
  planejado: "Planejado",
  recusado: "Recusado",
};

export const STATUS_ORDER = ["ideia", "planejado", "em_desenvolvimento", "concluido"] as const;

const TAG_BASE = "border-transparent font-medium";

export const TYPE_TAG_CLASS: Record<string, string> = {
  feature: `${TAG_BASE} bg-tag-feature text-tag-feature-foreground`,
  qol: `${TAG_BASE} bg-tag-qol text-tag-qol-foreground`,
  bug: `${TAG_BASE} bg-tag-bug text-tag-bug-foreground`,
  produto: `${TAG_BASE} bg-tag-feature text-tag-feature-foreground`,
  teste: `${TAG_BASE} bg-tag-medium text-tag-medium-foreground`,
  debito_tecnico: `${TAG_BASE} bg-tag-hard text-tag-hard-foreground`,
  compliance: `${TAG_BASE} bg-tag-planned text-tag-planned-foreground`,
  seguranca: `${TAG_BASE} bg-tag-bug text-tag-bug-foreground`,
  discovery: `${TAG_BASE} bg-tag-idea text-tag-idea-foreground`,
  infra: `${TAG_BASE} bg-tag-neutral text-tag-neutral-foreground`,
  operacional: `${TAG_BASE} bg-tag-qol text-tag-qol-foreground`,
};

export const TYPE_ORDER = Object.keys(TYPE_LABELS);

export const STATUS_TAG_CLASS: Record<string, string> = {
  ideia: `${TAG_BASE} bg-tag-idea text-tag-idea-foreground`,
  planejado: `${TAG_BASE} bg-tag-planned text-tag-planned-foreground`,
  em_desenvolvimento: `${TAG_BASE} bg-tag-progress text-tag-progress-foreground`,
  concluido: `${TAG_BASE} bg-tag-done text-tag-done-foreground`,
};

export const DIFFICULTY_TAG_CLASS: Record<string, string> = {
  muito_simples: `${TAG_BASE} bg-tag-easy text-tag-easy-foreground`,
  simples: `${TAG_BASE} bg-tag-easy text-tag-easy-foreground`,
  moderado: `${TAG_BASE} bg-tag-medium text-tag-medium-foreground`,
  complexo: `${TAG_BASE} bg-tag-hard text-tag-hard-foreground`,
  muito_complexo: `${TAG_BASE} bg-tag-hard text-tag-hard-foreground`,
};

export const NEUTRAL_TAG_CLASS = `${TAG_BASE} bg-tag-neutral text-tag-neutral-foreground`;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  "pdf",
  "png",
  "jpg",
  "jpeg",
  "csv",
  "doc",
  "docx",
  "xls",
  "xlsx",
  "ppt",
  "pptx",
  "txt",
  "md",
];
export const ALLOWED_UPLOAD_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "text/csv",
  "text/plain",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "text/markdown",
];
export const ALLOWED_UPLOAD_ACCEPT =
  ".pdf,.png,.jpg,.jpeg,.csv,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.md";
export const ALLOWED_UPLOAD_LABEL = "Anexar arquivo";
export const ALLOWED_UPLOAD_ERROR =
  "Somente arquivos .pdf, .png, .jpg, .csv, .txt, .md, .doc(x), .xls(x) e .ppt(x) são aceitos";

/** Limite de tamanho por arquivo (15MB). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;
export const MAX_UPLOAD_ERROR = "Cada arquivo deve ter no máximo 15MB";

/** Aceita PDF, PNG, JPG, CSV, DOCX, XLSX e Markdown. */
export function isAllowedUpload(file: { name: string; type: string }): boolean {
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  return ALLOWED_UPLOAD_EXTENSIONS.includes(ext) || ALLOWED_UPLOAD_TYPES.includes(file.type);
}

/** Valida extensão e tamanho; retorna o motivo da recusa ou null. */
export function uploadRejectionReason(file: {
  name: string;
  type: string;
  size: number;
}): string | null {
  if (!isAllowedUpload(file)) return ALLOWED_UPLOAD_ERROR;
  if (file.size > MAX_UPLOAD_BYTES) return MAX_UPLOAD_ERROR;
  return null;
}

/** Dias sem atualização para um item ser considerado "parado". */
export const STALE_DAYS = 14;

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000);
}

export function isStale(item: { updated_at: string; status: string }): boolean {
  return item.status !== "concluido" && daysSince(item.updated_at) >= STALE_DAYS;
}

export const PERIODS = ["2026-Q2", "2026-Q3", "2026-Q4", "2027-Q1", "Sem período"] as const;

export const PRD_TEMPLATE = `## Problema

## Histórias de usuário

## Escopo
**Dentro da versão**

**Fora da versão**

## Métricas de sucesso

## Casos de borda

## Dependências
`;
/** Conta que nunca pode ser rebaixada nem desativada. */
export const PROTECTED_ADMIN_EMAIL = "joao.neto@valori.com.vc";

export const ROLE_LABELS: Record<string, string> = {
  admin: "Admin/PM",
  collaborator: "Colaborador",
};

export type ManagedUser = {
  id: string;
  email: string | null;
  role: "admin" | "collaborator";
  is_active: boolean;
};

export function isProtectedAccount(email: string | null | undefined): boolean {
  return (email ?? "").toLowerCase() === PROTECTED_ADMIN_EMAIL;
}

export function countActiveAdmins(users: ManagedUser[]): number {
  return users.filter((u) => u.role === "admin" && u.is_active).length;
}

/** Motivo pelo qual o papel não pode mudar, ou null quando é permitido. */
export function roleChangeBlockedReason(
  user: ManagedUser,
  nextRole: "admin" | "collaborator",
  users: ManagedUser[],
): string | null {
  if (nextRole === user.role) return null;
  if (nextRole === "admin") return null;
  if (isProtectedAccount(user.email)) return "Esta conta é sempre administradora.";
  if (user.is_active && countActiveAdmins(users) <= 1) {
    return "É necessário manter ao menos um administrador ativo.";
  }
  return null;
}

/** Motivo pelo qual a conta não pode ser desativada, ou null quando é permitido. */
export function deactivationBlockedReason(user: ManagedUser, users: ManagedUser[]): string | null {
  if (!user.is_active) return null;
  if (isProtectedAccount(user.email)) return "Esta conta não pode ser desativada.";
  if (user.role === "admin" && countActiveAdmins(users) <= 1) {
    return "É necessário manter ao menos um administrador ativo.";
  }
  return null;
}

/** Tamanho mínimo de uma senha definida pelo próprio usuário. É o mínimo que o
 *  Supabase aceita por padrão. */
export const MIN_PASSWORD_LENGTH = 6;

/** Uma senha temporária definida por outra pessoa é mais exposta: ela trafega
 *  por chat ou e-mail e, no reset em massa, vale para várias contas ao mesmo
 *  tempo. Por isso o mínimo aqui é maior. */
export const MIN_TEMP_PASSWORD_LENGTH = 8;

/**
 * Motivo pelo qual a senha não serve, ou null quando está boa.
 *
 * `confirm` é opcional: quando vem, precisa bater. Deixar a validação aqui
 * (e não espalhada nos formulários) mantém a mesma regra na tela de troca, no
 * cadastro de conta e no reset em massa.
 */
export function passwordProblem(
  password: string,
  options: { minLength?: number; confirm?: string } = {},
): string | null {
  const min = options.minLength ?? MIN_PASSWORD_LENGTH;
  if (password.trim().length === 0) return "Informe uma senha.";
  if (password.length < min) return `A senha deve ter pelo menos ${min} caracteres.`;
  if (options.confirm !== undefined && password !== options.confirm) {
    return "As senhas não coincidem.";
  }
  return null;
}

/** Iniciais para o fallback do avatar. */
export function initials(name: string | null | undefined): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]![0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]![0] ?? "") : "";
  return (first + last).toUpperCase();
}

/** Extrai os nomes mencionados (@fulano) de um texto. */
export function parseMentionNames(text: string): string[] {
  return Array.from(text.matchAll(/@([\p{L}\p{N}._-]+)/gu)).map((m) => m[1]!.toLowerCase());
}

export type DirectoryEntry = { id: string; display_name: string | null; avatar_url: string | null };

/** Resolve menções escritas no texto para ids de pessoas do diretório. */
export function resolveMentions(text: string, people: DirectoryEntry[]): string[] {
  const names = parseMentionNames(text);
  if (names.length === 0) return [];
  const ids = new Set<string>();
  for (const p of people) {
    const handle = (p.display_name ?? "").trim().toLowerCase().replace(/\s+/g, "_");
    const first = (p.display_name ?? "").trim().toLowerCase().split(/\s+/)[0] ?? "";
    if (names.some((n) => n === handle || (first !== "" && n === first))) ids.add(p.id);
  }
  return Array.from(ids);
}

export function mentionHandle(name: string | null | undefined): string {
  return (name ?? "").trim().toLowerCase().replace(/\s+/g, "_");
}

/** Serializa linhas em CSV (separador ponto e vírgula, compatível com Excel pt-BR). */
export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const cell = (v: string | number | null | undefined) =>
    `"${String(v ?? "").replace(/"/g, '""')}"`;
  return [headers, ...rows].map((r) => r.map(cell).join(";")).join("\r\n");
}

export type AppPage = {
  id: string;
  path: string;
  label: string;
  is_visible: boolean;
  sort_order: number;
};

/**
 * Páginas que devem aparecer no menu principal: visíveis, conhecidas pelo
 * roteador e ordenadas por sort_order (empate resolvido pelo rótulo).
 */
export function visibleNavPages<T extends string>(
  pages: AppPage[],
  knownPaths: readonly T[],
): (AppPage & { path: T })[] {
  const known = new Set<string>(knownPaths);
  return pages
    .filter((p) => p.is_visible && known.has(p.path))
    .sort((a, b) => a.sort_order - b.sort_order || a.label.localeCompare(b.label))
    .map((p) => p as AppPage & { path: T });
}

/**
 * Agrupamento do menu lateral.
 *
 * A visibilidade e a ordem continuam vindo da tabela app_pages; o grupo é só
 * apresentação, então mora no código. Um caminho sem grupo declarado cai no
 * último grupo, e não some do menu.
 */
export const NAV_GROUP_ORDER = [
  "Visão geral",
  "Produto",
  "Operações",
  "Provas de conceito",
] as const;

export type NavGroup = (typeof NAV_GROUP_ORDER)[number];

const NAV_GROUP_BY_PATH: Record<string, NavGroup> = {
  "/dashboard": "Visão geral",
  "/backlog": "Produto",
  "/roadmap": "Produto",
  "/ideias": "Produto",
  "/priorizacao": "Produto",
  "/esteira": "Operações",
  "/kanban": "Operações",
  "/visao-indicadores": "Provas de conceito",
  "/enriquecimento": "Provas de conceito",
};

const FALLBACK_GROUP: NavGroup = "Provas de conceito";

export function navGroupFor(path: string): NavGroup {
  return NAV_GROUP_BY_PATH[path] ?? FALLBACK_GROUP;
}

/** Quebra as páginas do menu em grupos, preservando a ordem de cada lado e
 *  descartando grupos que ficaram sem nenhuma página visível. */
export function groupNavPages<T extends { path: string }>(
  pages: T[],
): { group: NavGroup; pages: T[] }[] {
  return NAV_GROUP_ORDER.map((group) => ({
    group,
    pages: pages.filter((p) => navGroupFor(p.path) === group),
  })).filter((entry) => entry.pages.length > 0);
}
