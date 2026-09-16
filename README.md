# Valori PM

Ferramenta interna de gestão de produto da Valori Tech, e vitrine das provas de
conceito do time: backlog priorizado, roadmap visual, esteira de onboarding,
kanban, indicadores por parceiro e enriquecimento de cadastro por CNPJ.

O projeto é um app Vite/TanStack Start comum: não depende de nenhuma plataforma
de edição para rodar, buildar ou publicar.

## Stack

- **Frontend:** TanStack Start (React 19 + TypeScript), Tailwind CSS v4, shadcn/ui, Recharts
- **Backend:** Supabase (Postgres, autenticação e Row Level Security)
- **Build/deploy:** Vite + Nitro, com preset `netlify` por padrão
- **Testes:** Vitest

## Rodando localmente

```bash
npm install          # ou bun install
cp .env.example .env # preencha as variáveis do Supabase
npm run dev          # http://localhost:5173
```

O `package-lock.json` **precisa ficar commitado**, e não é só por
reprodutibilidade: o npm 10.9.x que acompanha o Node 22 tem um bug no resolvedor
de dependências que derruba o `npm install` deste projeto com
`Cannot read properties of null (reading 'edgesOut')`. Com o lock no
repositório, a Netlify roda `npm ci`, que lê o lock direto e não passa por esse
caminho. O `netlify.toml` ainda pede `NPM_VERSION = "11"` como segunda camada,
para o caso de o lock sair de sincronia com o `package.json`.

Se precisar regenerar o lock, use npm 11 ou mais novo (`npm i -g npm@11`) —
no npm 10.9.x o próprio `npm install` local falha com o mesmo erro.

Outros comandos:

```bash
npm run test         # testes das regras de negócio
npm run typecheck    # TypeScript sem emitir
npm run lint         # ESLint + Prettier
npm run build        # build de produção
```

## Variáveis de ambiente

Estão documentadas em `.env.example`. Em resumo:

| Variável | Para que serve |
| --- | --- |
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_PUBLISHABLE_KEY` | Conexão do navegador com o Supabase |
| `SUPABASE_URL` / `SUPABASE_PUBLISHABLE_KEY` | Mesmos valores, lidos no SSR |
| `SUPABASE_SERVICE_ROLE_KEY` | Painel administrativo: criar e remover contas, alterar senhas |
| `VITE_ENRIQUECIMENTO_API_URL` | Serviço que faz a ponte com Receita, ABECS e ZapSign (opcional) |

A chave *publishable* é pública por natureza — ela vai no bundle do navegador.
Quem protege os dados é o Row Level Security do banco, não o segredo da chave.

A `service_role` é o oposto: ela **ignora o RLS inteiro** e vale como senha
mestra do banco. Fica só no servidor, sem o prefixo `VITE_`, e é o que permite
ao painel administrativo criar conta, remover conta e trocar a senha de alguém.
Sem ela essas telas específicas falham; o resto do app funciona normalmente.

## Publicando na Netlify

1. Suba o repositório e conecte-o em **Add new site → Import an existing project**.
2. O `netlify.toml` já define o comando (`npm run build`) e a pasta publicada
   (`dist`). Não é preciso configurar nada na interface.
3. Em **Site configuration → Environment variables**, cadastre as quatro
   variáveis do Supabase da tabela acima (e, se for usar outro serviço de
   enriquecimento, também a quinta).
4. Faça o deploy.

Um detalhe que vale saber antes de mexer aqui: **cada preset do Nitro tem um
layout de saída diferente**. O preset `netlify` escreve os arquivos estáticos em
`dist/` e a função de SSR em `.netlify/functions-internal/server/`; o preset
`node-server` é que usa `.output/`. Trocar de preset sem trocar o `publish` é o
caminho mais curto para um "Deploy directory does not exist".

**Outro provedor?** O alvo do build vem de `NITRO_PRESET`, lido em
`vite.config.ts`. Para a Vercel, `NITRO_PRESET=vercel npm run build`; para um
container próprio, `NITRO_PRESET=node-server npm run build` e depois
`node .output/server/index.mjs`.

## Banco de dados

O schema inteiro está em `supabase/migrations/`, em ordem cronológica. Para
apontar o app para um projeto Supabase novo:

1. Crie o projeto no Supabase e rode as migrations na ordem dos nomes de arquivo
   (`supabase db push`, ou colando cada arquivo no SQL Editor).
2. Crie os buckets de storage `avatars` e `backlog-attachments` — as políticas
   de acesso deles já vêm nas migrations.
3. Preencha as variáveis de ambiente com a URL e a chave do projeto novo.
4. Cadastre-se pela tela de login: o primeiro usuário vira Admin/PM.

## Estrutura

```
src/
  routes/
    auth.tsx                      login (é também a página inicial)
    _authenticated/
      route.tsx                   guarda de sessão + shell (menu lateral, topo, rodapé)
      dashboard.tsx               visão geral
      backlog.index.tsx           lista do backlog com filtros e visões salvas
      backlog.$id.tsx             detalhe do item, notas, subtarefas e anexos
      roadmap.tsx                 colunas por período, com arrastar e soltar
      ideias.tsx                  caixa de ideias e votos
      priorizacao.tsx             capacidade e sequenciamento
      esteira.tsx                 esteira de onboarding do Portal do Parceiro
      kanban.tsx                  quadro de execução
      visao-indicadores.tsx       POC: indicadores por parceiro (PowerBI embarcado)
      enriquecimento.tsx          POC: cadastro por CNPJ, MCC e contrato
      admin.*.tsx                 painel administrativo (usuários e páginas)
  lib/
    domain.ts                     regras de negócio e agrupamento do menu
    enriquecimento.ts             máscaras, CNPJ alfanumérico, MCC e contrato
    *.test.ts                     testes das duas
  components/                     componentes próprios e shadcn/ui
  integrations/supabase/          client do banco
supabase/migrations/              schema, políticas e dados de exemplo
```

## Identidade visual

A interface segue o Portal Valori: fundo verde muito claro, cartões brancos,
verde escuro na marca e âmbar como único destaque. Os valores ficam em
`src/styles.css`, em tokens: mudar a paleta ali muda o app inteiro, porque todo
componente lê desses tokens em vez de ter cor fixa.

Uma convenção que vale lembrar ao mexer no CSS: `--accent` é a superfície de
*hover* (verde bem claro), como o shadcn espera. O âmbar da marca mora em
`--gold`, usado só nos pontos de destaque.

## Provas de conceito

**Visão de Indicadores** (`/visao-indicadores`) é o ensaio visual de embarcar o
PowerBI da Valori no Portal de Parceiros, com cada parceiro vendo apenas os
próprios ECs. Os números são fictícios e vivem em `src/lib/indicadores-mock.ts`;
trocar o parceiro no filtro troca todos os dados da tela.

**Enriquecimento de cadastro** (`/enriquecimento`) parte de um CNPJ, busca os
dados cadastrais na Receita Federal e o MCC na base da ABECS, e gera o contrato
para assinatura na ZapSign a partir do modelo DOCTESTE. Aqui os dados são reais.

A página não fala direto com essas APIs: um serviço próprio faz a ponte, porque
nem a API MCC Central nem a da ZapSign liberam CORS para origens externas, e as
credenciais dessas contas não podem ficar no JavaScript da página, onde qualquer
visitante as leria. O endereço desse serviço é `VITE_ENRIQUECIMENTO_API_URL`, e
o código dele está no repositório `Abecsisbad` (FastAPI, publicado no Render).

## Modelo de dados

- `profiles` — nome, e-mail, foto (`avatar_url`, no bucket `avatars`) e `is_active`
- `user_roles` — papéis `admin` e `collaborator`, em tabela separada por segurança
- `app_pages` — quais páginas aparecem no menu, controlado em `/admin/paginas`
- `backlog_items` — itens com tipo, status, dificuldade, tema e período
- `backlog_subtasks`, `backlog_comments`, `backlog_attachments` — subtarefas, notas e anexos
- `prds`, `prd_versions` — documento Markdown e histórico (quem editou e quando)
- `feedback_requests`, `feedback_votes` — um voto por pessoa por pedido
- `objectives`, `key_results` — progresso calculado no app a partir de início/atual/meta

## Permissões

- **Admin/PM:** cria, edita e exclui itens do backlog, subtarefas, PRDs, objetivos
  e resultados-chave; move cards no roadmap; faz triagem de ideias; gerencia
  usuários e páginas no painel administrativo.
- **Colaborador:** visualiza tudo, envia ideias e vota, escreve notas na discussão
  dos itens e anexa arquivos.
- **Notas e anexos:** qualquer autenticado cria; editar ou remover só o autor ou um admin.
- **Anexos:** `.pdf`, `.png`, `.jpg`, `.csv`, `.docx`, `.xlsx`, `.md`, até 15MB por arquivo.
- O **primeiro usuário cadastrado vira Admin/PM**; os demais entram como Colaborador.
- `joao.neto@valori.com.vc` **sempre** recebe o papel Admin/PM ao se cadastrar, e
  triggers no banco impedem que essa conta seja rebaixada ou desativada — assim
  como impedem o sistema de ficar sem nenhum administrador ativo.

Todas essas regras são aplicadas no banco por RLS, não apenas na interface.

## Senhas

Quem define senha de outra pessoa é só `joao.neto@valori.com.vc`. A verificação
acontece no servidor, em `src/lib/users-admin.functions.ts`: o middleware valida
o JWT, e `assertOwner` compara o e-mail que veio dentro do token — nunca algo
enviado pelo cliente. Esconder o botão na interface é conveniência, não
segurança.

Em `/admin/usuarios` existem duas operações:

**Alterar a senha de uma conta.** Botão "Senha" na linha da pessoa. Por padrão
marca a conta para trocar de senha no próximo acesso; dá para desmarcar. Ninguém
é avisado por e-mail — combine a senha por um canal seguro.

**Resetar todas as senhas.** No fim da página, em vermelho. Aplica a mesma senha
temporária a todas as contas, inclusive a de quem está clicando, e liga a troca
obrigatória para todo mundo. Pede a palavra `RESETAR` digitada à mão, porque não
tem desfazer. O relatório mostra quantas contas foram redefinidas e quais
falharam.

A trava do primeiro acesso é o campo `profiles.must_change_password`, lido em
`_authenticated/route.tsx`: com ele ligado, qualquer rota protegida redireciona
para `/trocar-senha`. Uma sessão já aberta não cai na hora — a pessoa esbarra na
trava na primeira navegação. Se precisar derrubar as sessões imediatamente,
use **Authentication → Users** no painel do Supabase.

Senhas definidas por outra pessoa exigem 8 caracteres, e não os 6 que o Supabase
aceita por padrão: elas trafegam por chat ou e-mail e, no reset em massa, valem
para várias contas ao mesmo tempo. A regra mora em `passwordProblem`, em
`domain.ts`, com testes.

## Decisões de arquitetura

1. **Regras de negócio em `src/lib/`,** cobertas por testes, separadas da tela.
2. **Papéis em tabela separada** (`user_roles` + função `has_role`), nunca no
   perfil, para evitar escalonamento de privilégio.
3. **RLS como fronteira de segurança:** leitura liberada para autenticados,
   escrita restrita conforme o papel.
4. **Rotas protegidas sob `_authenticated/`**, com sessão validada antes de renderizar.
5. **Menu vindo do banco** (`app_pages`): esconder uma página não exige deploy.
6. **Identidade visual em tokens**, não em classes espalhadas pelas páginas.
