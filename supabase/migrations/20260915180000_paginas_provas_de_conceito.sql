-- Registra as duas provas de conceito no menu principal.
--
-- A tela de Gestão de páginas (/admin/paginas) só enxerga o que está em
-- app_pages, e o menu lateral só mostra caminhos que o roteador conhece. Sem
-- esta inserção, as duas páginas existiriam nas rotas mas não apareceriam para
-- ninguém e nem poderiam ser ligadas/desligadas pelo admin.
--
-- ON CONFLICT DO NOTHING deixa a migration segura para rodar de novo, e
-- preserva a escolha do admin caso ele já tenha ocultado a página.

INSERT INTO public.app_pages (path, label, sort_order) VALUES
  ('/visao-indicadores', 'Visão de Indicadores', 8),
  ('/enriquecimento', 'Enriquecimento', 9)
ON CONFLICT (path) DO NOTHING;
