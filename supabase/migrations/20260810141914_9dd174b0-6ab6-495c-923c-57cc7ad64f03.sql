-- Enums
CREATE TYPE public.app_role AS ENUM ('admin', 'collaborator');
CREATE TYPE public.item_type AS ENUM ('feature', 'qol', 'bug');
CREATE TYPE public.item_status AS ENUM ('ideia', 'planejado', 'em_desenvolvimento', 'concluido');
CREATE TYPE public.difficulty AS ENUM ('muito_simples', 'simples', 'moderado', 'complexo', 'muito_complexo');
CREATE TYPE public.feedback_status AS ENUM ('novo', 'em_analise', 'planejado', 'recusado');

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Roles
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  role public.app_role NOT NULL DEFAULT 'collaborator',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_roles_select" ON public.user_roles FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

-- Auto profile + role on signup: first user becomes admin
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE user_count INT;
BEGIN
  INSERT INTO public.profiles (id, email, display_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  SELECT count(*) INTO user_count FROM public.user_roles;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN user_count = 0 THEN 'admin'::public.app_role ELSE 'collaborator'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Objectives / Key results
CREATE TABLE public.objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  quarter TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.objectives TO authenticated;
GRANT ALL ON public.objectives TO service_role;
ALTER TABLE public.objectives ENABLE ROW LEVEL SECURITY;
CREATE POLICY "objectives_select" ON public.objectives FOR SELECT TO authenticated USING (true);
CREATE POLICY "objectives_admin_write" ON public.objectives FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER objectives_updated_at BEFORE UPDATE ON public.objectives FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.key_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objective_id UUID NOT NULL REFERENCES public.objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  unit TEXT,
  start_value NUMERIC NOT NULL DEFAULT 0,
  current_value NUMERIC NOT NULL DEFAULT 0,
  target_value NUMERIC NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.key_results TO authenticated;
GRANT ALL ON public.key_results TO service_role;
ALTER TABLE public.key_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "key_results_select" ON public.key_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "key_results_admin_write" ON public.key_results FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER key_results_updated_at BEFORE UPDATE ON public.key_results FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Backlog
CREATE TABLE public.backlog_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  type public.item_type NOT NULL DEFAULT 'feature',
  status public.item_status NOT NULL DEFAULT 'ideia',
  difficulty public.difficulty NOT NULL DEFAULT 'moderado',
  theme TEXT,
  period TEXT,
  reach NUMERIC NOT NULL DEFAULT 100,
  impact NUMERIC NOT NULL DEFAULT 1,
  confidence NUMERIC NOT NULL DEFAULT 80,
  effort NUMERIC NOT NULL DEFAULT 1 CHECK (effort > 0),
  rice_score NUMERIC GENERATED ALWAYS AS (ROUND((reach * impact * (confidence / 100.0)) / NULLIF(effort, 0), 2)) STORED,
  objective_id UUID REFERENCES public.objectives(id) ON DELETE SET NULL,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.backlog_items TO authenticated;
GRANT ALL ON public.backlog_items TO service_role;
ALTER TABLE public.backlog_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "backlog_select" ON public.backlog_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "backlog_admin_write" ON public.backlog_items FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER backlog_updated_at BEFORE UPDATE ON public.backlog_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- PRDs
CREATE TABLE public.prds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  backlog_item_id UUID NOT NULL UNIQUE REFERENCES public.backlog_items(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prds TO authenticated;
GRANT ALL ON public.prds TO service_role;
ALTER TABLE public.prds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prds_select" ON public.prds FOR SELECT TO authenticated USING (true);
CREATE POLICY "prds_admin_write" ON public.prds FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER prds_updated_at BEFORE UPDATE ON public.prds FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.prd_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prd_id UUID NOT NULL REFERENCES public.prds(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  edited_by UUID,
  editor_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.prd_versions TO authenticated;
GRANT ALL ON public.prd_versions TO service_role;
ALTER TABLE public.prd_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "prd_versions_select" ON public.prd_versions FOR SELECT TO authenticated USING (true);
CREATE POLICY "prd_versions_admin_insert" ON public.prd_versions FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Feedback
CREATE TABLE public.feedback_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  area TEXT,
  status public.feedback_status NOT NULL DEFAULT 'novo',
  backlog_item_id UUID REFERENCES public.backlog_items(id) ON DELETE SET NULL,
  created_by UUID,
  author_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.feedback_requests TO authenticated;
GRANT ALL ON public.feedback_requests TO service_role;
ALTER TABLE public.feedback_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "feedback_select" ON public.feedback_requests FOR SELECT TO authenticated USING (true);
CREATE POLICY "feedback_insert" ON public.feedback_requests FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);
CREATE POLICY "feedback_admin_update" ON public.feedback_requests FOR UPDATE TO authenticated USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE POLICY "feedback_admin_delete" ON public.feedback_requests FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE TRIGGER feedback_updated_at BEFORE UPDATE ON public.feedback_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.feedback_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL REFERENCES public.feedback_requests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (request_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.feedback_votes TO authenticated;
GRANT ALL ON public.feedback_votes TO service_role;
ALTER TABLE public.feedback_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "votes_select" ON public.feedback_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "votes_insert_own" ON public.feedback_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "votes_delete_own" ON public.feedback_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Seed data (Valori Tech)
INSERT INTO public.objectives (id, title, description, quarter) VALUES
 ('11111111-1111-1111-1111-111111111111', 'Reduzir atrito no onboarding de novos lojistas', 'Tornar o cadastro mais rápido e com menos erros de dados.', '2026-Q3'),
 ('22222222-2222-2222-2222-222222222222', 'Aumentar a qualidade dos dados cadastrais', 'Enriquecer base com CNPJ/MCC confiáveis para risco e precificação.', '2026-Q3');

INSERT INTO public.key_results (objective_id, title, unit, start_value, current_value, target_value) VALUES
 ('11111111-1111-1111-1111-111111111111', 'Tempo médio de cadastro', 'min', 18, 12, 7),
 ('11111111-1111-1111-1111-111111111111', 'Taxa de conclusão do cadastro', '%', 62, 74, 85),
 ('22222222-2222-2222-2222-222222222222', 'Cadastros com MCC correto', '%', 55, 71, 95),
 ('22222222-2222-2222-2222-222222222222', 'Retrabalho de backoffice por dado inválido', 'casos/mês', 320, 210, 80);

INSERT INTO public.backlog_items (id, title, description, type, status, difficulty, theme, period, reach, impact, confidence, effort, objective_id) VALUES
 ('aaaaaaa1-0000-4000-8000-000000000001', 'Enriquecimento de cadastro via CNPJ', 'Consultar dados públicos do CNPJ e preencher automaticamente razão social, endereço e situação cadastral.', 'feature', 'em_desenvolvimento', 'complexo', 'Cadastro', '2026-Q3', 4200, 3, 85, 8, '22222222-2222-2222-2222-222222222222'),
 ('aaaaaaa1-0000-4000-8000-000000000002', 'Sugestão automática de MCC', 'Sugerir o MCC a partir do CNAE principal do lojista, com opção de ajuste manual.', 'feature', 'planejado', 'moderado', 'Cadastro', '2026-Q4', 4200, 3, 70, 5, '22222222-2222-2222-2222-222222222222'),
 ('aaaaaaa1-0000-4000-8000-000000000003', 'Validação de CNPJ em tempo real no formulário', 'Feedback imediato de CNPJ inválido antes do envio.', 'qol', 'concluido', 'simples', 'Cadastro', '2026-Q2', 5000, 2, 95, 2, '11111111-1111-1111-1111-111111111111'),
 ('aaaaaaa1-0000-4000-8000-000000000004', 'Cadastro trava ao anexar contrato acima de 10MB', 'Upload falha silenciosamente sem mensagem de erro.', 'bug', 'planejado', 'simples', 'Contratos', '2026-Q3', 900, 2, 90, 1, '11111111-1111-1111-1111-111111111111'),
 ('aaaaaaa1-0000-4000-8000-000000000005', 'Assinatura eletrônica de contrato', 'Permitir assinatura digital do contrato de credenciamento direto no fluxo.', 'feature', 'ideia', 'muito_complexo', 'Contratos', '2027-Q1', 3800, 3, 60, 13, '11111111-1111-1111-1111-111111111111'),
 ('aaaaaaa1-0000-4000-8000-000000000006', 'Salvar rascunho do cadastro', 'Permitir retomar o cadastro de onde parou.', 'qol', 'planejado', 'moderado', 'Cadastro', '2026-Q4', 3000, 2, 80, 3, '11111111-1111-1111-1111-111111111111'),
 ('aaaaaaa1-0000-4000-8000-000000000007', 'Painel de status de credenciamento para operações', 'Visão única do funil de credenciamento por etapa.', 'feature', 'ideia', 'moderado', 'Operações', '2027-Q1', 120, 3, 70, 5, NULL),
 ('aaaaaaa1-0000-4000-8000-000000000008', 'Reprocessamento automático de consultas CNPJ com falha', 'Retentar consultas que falharam por indisponibilidade da fonte.', 'qol', 'ideia', 'moderado', 'Cadastro', '2026-Q4', 1500, 2, 75, 3, '22222222-2222-2222-2222-222222222222');

INSERT INTO public.prds (backlog_item_id, content) VALUES
 ('aaaaaaa1-0000-4000-8000-000000000001', E'## Problema\nO cadastro de lojistas depende de digitação manual de dados que já são públicos, gerando erros, retrabalho de backoffice e abandono no funil.\n\n## Histórias de usuário\n- Como lojista, quero que meus dados sejam preenchidos a partir do CNPJ para concluir o cadastro mais rápido.\n- Como analista de operações, quero dados cadastrais confiáveis para reduzir retrabalho.\n\n## Escopo\n**Dentro da versão**\n- Consulta por CNPJ com preenchimento de razão social, nome fantasia, endereço e situação cadastral.\n- Cache de consultas por 30 dias.\n\n**Fora da versão**\n- Consulta de sócios e quadro societário.\n- Enriquecimento de dados financeiros.\n\n## Métricas de sucesso\n- Tempo médio de cadastro < 7 min.\n- Cadastros com MCC correto > 95%.\n\n## Casos de borda\n- CNPJ inapto ou baixado.\n- Fonte de dados indisponível (fallback para preenchimento manual).\n- CNPJ válido sem endereço completo.\n\n## Dependências\n- Contrato com provedor de dados de CNPJ.\n- Ajuste no serviço de cadastro para campos autopreenchidos.');
