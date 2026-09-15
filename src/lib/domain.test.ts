import { describe, expect, it } from "vitest";
import {
  groupNavPages,
  keyResultProgress,
  navGroupFor,
  objectiveProgress,
  visibleNavPages,
  type AppPage,
} from "./domain";

describe("progresso de OKR", () => {
  it("calcula progresso de um key result crescente", () => {
    expect(keyResultProgress({ start_value: 0, current_value: 50, target_value: 100 })).toBe(50);
  });

  it("calcula progresso de um key result decrescente", () => {
    expect(keyResultProgress({ start_value: 18, current_value: 12, target_value: 6 })).toBe(50);
  });

  it("limita entre 0 e 100", () => {
    expect(keyResultProgress({ start_value: 0, current_value: 200, target_value: 100 })).toBe(100);
    expect(keyResultProgress({ start_value: 0, current_value: -20, target_value: 100 })).toBe(0);
  });

  it("faz a média dos key results do objetivo", () => {
    expect(
      objectiveProgress([
        { start_value: 0, current_value: 50, target_value: 100 },
        { start_value: 0, current_value: 100, target_value: 100 },
      ]),
    ).toBe(75);
  });

  it("retorna 0 sem key results", () => {
    expect(objectiveProgress([])).toBe(0);
  });
});
import {
  countActiveAdmins,
  deactivationBlockedReason,
  initials,
  isProtectedAccount,
  roleChangeBlockedReason,
  type ManagedUser,
} from "./domain";
import { MAX_UPLOAD_BYTES, uploadRejectionReason } from "./domain";

describe("validação de anexos", () => {
  it("aceita os tipos permitidos dentro do limite", () => {
    expect(uploadRejectionReason({ name: "a.jpg", type: "image/jpeg", size: 1000 })).toBeNull();
    expect(uploadRejectionReason({ name: "b.csv", type: "text/csv", size: 1000 })).toBeNull();
    expect(
      uploadRejectionReason({ name: "c.pdf", type: "application/pdf", size: 1000 }),
    ).toBeNull();
  });

  it("recusa tipo não permitido", () => {
    expect(uploadRejectionReason({ name: "x.exe", type: "", size: 10 })).toBeTruthy();
  });

  it("recusa arquivo acima de 15MB", () => {
    expect(
      uploadRejectionReason({ name: "a.pdf", type: "application/pdf", size: MAX_UPLOAD_BYTES + 1 }),
    ).toBeTruthy();
  });
});

const protectedAdmin: ManagedUser = {
  id: "1",
  email: "joao.neto@valori.com.vc",
  role: "admin",
  is_active: true,
};
const otherAdmin: ManagedUser = {
  id: "2",
  email: "ana@valori.com.vc",
  role: "admin",
  is_active: true,
};
const collab: ManagedUser = {
  id: "3",
  email: "bia@valori.com.vc",
  role: "collaborator",
  is_active: true,
};

describe("gestão de usuários", () => {
  it("identifica a conta protegida", () => {
    expect(isProtectedAccount("JOAO.NETO@valori.com.vc")).toBe(true);
    expect(isProtectedAccount("ana@valori.com.vc")).toBe(false);
  });

  it("conta administradores ativos", () => {
    expect(countActiveAdmins([protectedAdmin, otherAdmin, collab])).toBe(2);
    expect(countActiveAdmins([{ ...otherAdmin, is_active: false }])).toBe(0);
  });

  it("nunca rebaixa a conta protegida", () => {
    expect(
      roleChangeBlockedReason(protectedAdmin, "collaborator", [protectedAdmin, otherAdmin]),
    ).toBeTruthy();
  });

  it("não remove o último admin", () => {
    expect(roleChangeBlockedReason(otherAdmin, "collaborator", [otherAdmin, collab])).toBeTruthy();
    expect(
      roleChangeBlockedReason(otherAdmin, "collaborator", [otherAdmin, protectedAdmin]),
    ).toBeNull();
  });

  it("permite promover a admin", () => {
    expect(roleChangeBlockedReason(collab, "admin", [otherAdmin, collab])).toBeNull();
  });

  it("bloqueia desativar conta protegida e último admin", () => {
    expect(deactivationBlockedReason(protectedAdmin, [protectedAdmin])).toBeTruthy();
    expect(deactivationBlockedReason(otherAdmin, [otherAdmin, collab])).toBeTruthy();
    expect(deactivationBlockedReason(collab, [otherAdmin, collab])).toBeNull();
  });

  it("gera iniciais do nome", () => {
    expect(initials("João Neto")).toBe("JN");
    expect(initials("Ana")).toBe("A");
    expect(initials("")).toBe("?");
  });
});

describe("páginas do menu principal", () => {
  const known = ["/dashboard", "/backlog", "/roadmap"] as const;
  const page = (path: string, sort_order: number, is_visible = true): AppPage => ({
    id: path,
    path,
    label: path.slice(1),
    is_visible,
    sort_order,
  });

  it("ordena por sort_order", () => {
    const out = visibleNavPages(
      [page("/roadmap", 3), page("/dashboard", 1), page("/backlog", 2)],
      known,
    );
    expect(out.map((p) => p.path)).toEqual(["/dashboard", "/backlog", "/roadmap"]);
  });

  it("remove páginas ocultas", () => {
    const out = visibleNavPages([page("/dashboard", 1), page("/backlog", 2, false)], known);
    expect(out.map((p) => p.path)).toEqual(["/dashboard"]);
  });

  it("ignora caminhos desconhecidos pelo roteador", () => {
    const out = visibleNavPages([page("/dashboard", 1), page("/inexistente", 2)], known);
    expect(out.map((p) => p.path)).toEqual(["/dashboard"]);
  });

  it("desempata pelo rótulo", () => {
    const out = visibleNavPages([page("/roadmap", 1), page("/backlog", 1)], known);
    expect(out.map((p) => p.path)).toEqual(["/backlog", "/roadmap"]);
  });
});

describe("agrupamento do menu lateral", () => {
  it("coloca cada caminho no seu grupo e preserva a ordem recebida", () => {
    const grupos = groupNavPages([
      { path: "/dashboard" },
      { path: "/backlog" },
      { path: "/roadmap" },
      { path: "/kanban" },
      { path: "/visao-indicadores" },
      { path: "/enriquecimento" },
    ]);
    expect(grupos.map((g) => g.group)).toEqual([
      "Visão geral",
      "Produto",
      "Operações",
      "Provas de conceito",
    ]);
    expect(grupos[1]?.pages.map((p) => p.path)).toEqual(["/backlog", "/roadmap"]);
    expect(grupos[3]?.pages.map((p) => p.path)).toEqual(["/visao-indicadores", "/enriquecimento"]);
  });

  it("não devolve grupo sem nenhuma página visível", () => {
    const grupos = groupNavPages([{ path: "/dashboard" }]);
    expect(grupos.map((g) => g.group)).toEqual(["Visão geral"]);
  });

  it("um caminho sem grupo declarado continua no menu", () => {
    expect(navGroupFor("/rota-nova")).toBe("Provas de conceito");
    const grupos = groupNavPages([{ path: "/rota-nova" }]);
    expect(grupos).toHaveLength(1);
  });
});
