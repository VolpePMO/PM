import { describe, expect, it } from "vitest";
import {
  camposFaltando,
  descreverMcc,
  digitosVerificadoresOk,
  escolherMelhorMcc,
  escolherSocio,
  maskCep,
  maskCnpj,
  maskCpf,
  maskTelefone,
  montarEnderecoLinha,
  montarPayloadContrato,
  normalizarReceita,
  onlyAlnumUpper,
  type ValoresContrato,
} from "./enriquecimento";

describe("máscaras", () => {
  it("formata o CNPJ conforme o usuário digita", () => {
    expect(maskCnpj("11")).toBe("11");
    expect(maskCnpj("11222333")).toBe("11.222.333");
    expect(maskCnpj("11222333000181")).toBe("11.222.333/0001-81");
  });

  it("aceita CNPJ alfanumérico e descarta pontuação e minúsculas", () => {
    expect(onlyAlnumUpper("12.abc.345/01de-35")).toBe("12ABC34501DE35");
    expect(maskCnpj("12abc34501de35")).toBe("12.ABC.345/01DE-35");
  });

  it("formata CPF e CEP", () => {
    expect(maskCpf("12345678909")).toBe("123.456.789-09");
    expect(maskCep("01310930")).toBe("01310-930");
  });

  it("formata telefone com 8 e com 9 dígitos", () => {
    expect(maskTelefone("1132654321")).toBe("(11) 3265-4321");
    expect(maskTelefone("11987654321")).toBe("(11) 98765-4321");
  });

  it("descarta o código do país colado no início", () => {
    expect(maskTelefone("5511987654321")).toBe("(11) 98765-4321");
  });
});

describe("dígitos verificadores do CNPJ", () => {
  it("não opina enquanto o número está incompleto", () => {
    expect(digitosVerificadoresOk("112223330001")).toBeNull();
  });

  it("aceita um CNPJ numérico válido", () => {
    expect(digitosVerificadoresOk("11222333000181")).toBe(true);
  });

  it("recusa quando um dígito muda", () => {
    expect(digitosVerificadoresOk("11222333000182")).toBe(false);
  });

  it("aceita o formato alfanumérico da regra de 2026", () => {
    // Os doze primeiros caracteres podem ser letras; os dois últimos, não.
    expect(digitosVerificadoresOk("12ABC34501DE35")).toBe(true);
    expect(digitosVerificadoresOk("12ABC34501DEAB")).toBe(false);
  });
});

describe("escolha do sócio signatário", () => {
  it("prefere quem tem administrador na qualificação", () => {
    const socio = escolherSocio([
      { nome: "Sócio comum", qualificacao_socio: { descricao: "Sócio" } },
      { nome: "Quem administra", qualificacao_socio: { descricao: "Sócio-Administrador" } },
    ]);
    expect(socio?.nome).toBe("Quem administra");
  });

  it("cai para o primeiro quando ninguém é administrador", () => {
    expect(escolherSocio([{ nome: "Primeiro" }, { nome: "Segundo" }])?.nome).toBe("Primeiro");
  });

  it("devolve nulo sem sócios", () => {
    expect(escolherSocio([])).toBeNull();
    expect(escolherSocio(undefined)).toBeNull();
  });
});

describe("escolha do MCC principal", () => {
  it("ignora códigos de preenchimento e respeita a ordem", () => {
    const escolhido = escolherMelhorMcc([
      { mcc: "0000", ordemMcc: 1 },
      { mcc: "5814", ordemMcc: 3 },
      { mcc: "5812", ordemMcc: 2 },
    ]);
    expect(descreverMcc(escolhido).codigo).toBe("5812");
  });

  it("usa a lista crua quando todos os códigos são de preenchimento", () => {
    expect(descreverMcc(escolherMelhorMcc([{ mcc: "XXXX" }])).codigo).toBe("XXXX");
  });

  it("devolve nulo para lista vazia", () => {
    expect(escolherMelhorMcc([])).toBeNull();
  });
});

describe("normalização da resposta da Receita", () => {
  const raw = {
    razao_social: "EMPRESA EXEMPLO LTDA",
    porte: { descricao: "Demais" },
    socios: [{ nome: "MARIA ADMIN", qualificacao_socio: { descricao: "Sócio-Administrador" } }],
    estabelecimento: {
      nome_fantasia: "Exemplo",
      data_inicio_atividade: "2019-03-07",
      tipo_logradouro: "AVENIDA",
      logradouro: "PAULISTA",
      numero: "1000",
      complemento: "SALA 12",
      bairro: "BELA VISTA",
      cep: "01310930",
      cidade: { nome: "São Paulo" },
      estado: { sigla: "SP" },
      atividade_principal: { subclasse: "6201-5/01", descricao: "Desenvolvimento de software" },
      email: "contato@exemplo.com.br",
      ddd1: "11",
      telefone1: "987654321",
    },
  };

  it("junta tipo e nome do logradouro e converte a data", () => {
    const d = normalizarReceita(raw);
    expect(d.logradouro).toBe("AVENIDA PAULISTA");
    expect(d.dataAbertura).toBe("07/03/2019");
    expect(d.cep).toBe("01310-930");
    expect(d.uf).toBe("SP");
  });

  it("propõe signatário, e-mail e telefone quando a consulta os traz", () => {
    const d = normalizarReceita(raw);
    expect(d.sugestaoNome).toBe("MARIA ADMIN");
    expect(d.sugestaoEmail).toBe("contato@exemplo.com.br");
    expect(d.sugestaoTelefone).toBe("(11) 98765-4321");
  });

  it("não quebra quando o estabelecimento vem vazio", () => {
    const d = normalizarReceita({ razao_social: "SÓ O NOME" });
    expect(d.razaoSocial).toBe("SÓ O NOME");
    expect(d.municipio).toBe("");
    expect(d.sugestaoTelefone).toBe("");
  });
});

describe("endereço em uma linha", () => {
  it("monta na ordem do contrato", () => {
    expect(
      montarEnderecoLinha({
        logradouro: "AVENIDA PAULISTA",
        numero: "1000",
        complemento: "SALA 12",
        bairro: "BELA VISTA",
        cep: "01310930",
      }),
    ).toBe("AVENIDA PAULISTA, 1000, SALA 12, BELA VISTA, CEP 01310-930");
  });

  it("omite as partes ausentes sem deixar vírgula solta", () => {
    expect(
      montarEnderecoLinha({
        logradouro: "RUA SEM NUMERO",
        numero: "",
        complemento: "",
        bairro: "CENTRO",
        cep: "",
      }),
    ).toBe("RUA SEM NUMERO, CENTRO");
  });
});

describe("contrato", () => {
  const completo: ValoresContrato = {
    razaoSocial: "EMPRESA EXEMPLO LTDA",
    nomeFantasia: "Exemplo",
    cnpjFormatado: "11.222.333/0001-81",
    enderecoLinha: "AVENIDA PAULISTA, 1000",
    municipio: "São Paulo",
    uf: "SP",
    nomeTitular: "MARIA ADMIN",
    cpfTitular: "123.456.789-09",
    email: "maria@exemplo.com.br",
    telefone: "(11) 98765-4321",
  };

  it("não acusa pendência quando tudo está preenchido", () => {
    expect(camposFaltando(completo)).toEqual([]);
  });

  it("aponta cada variável que sairia em branco no PDF", () => {
    const faltando = camposFaltando({ ...completo, cpfTitular: "", email: "   " });
    expect(faltando.map((p) => p.campo).sort()).toEqual(["cpfTitular", "email"]);
  });

  it("envia o telefone só com dígitos e leva o CNPJ para o external_id", () => {
    const payload = montarPayloadContrato(completo, {
      cnpjChars: "11222333000181",
      mcc: "5812",
      cnae: "6201-5/01",
      enviarEmail: true,
    });
    expect(payload.signer_phone_number).toBe("11987654321");
    expect(payload.external_id).toBe("11222333000181");
    expect(payload.send_automatic_email).toBe(true);
    expect(payload.data).toHaveLength(10);
    expect(payload.data.find((d) => d.de === "{{razao cliente}}")?.para).toBe(
      "EMPRESA EXEMPLO LTDA",
    );
    expect(payload.metadata.find((m) => m.key === "mcc")?.value).toBe("5812");
  });
});
