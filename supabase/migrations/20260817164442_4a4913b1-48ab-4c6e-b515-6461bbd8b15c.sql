CREATE TABLE public.ai_settings (
  id boolean PRIMARY KEY DEFAULT true,
  provider text NOT NULL DEFAULT 'lovable',
  model text NOT NULL DEFAULT 'google/gemini-3.6-flash',
  updated_by uuid,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT ai_settings_single_row CHECK (id),
  CONSTRAINT ai_settings_provider_check CHECK (provider IN ('lovable','anthropic','openai_compatible'))
);

GRANT SELECT, INSERT, UPDATE ON public.ai_settings TO authenticated;
GRANT ALL ON public.ai_settings TO service_role;

ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_settings_select ON public.ai_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY ai_settings_insert ON public.ai_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY ai_settings_update ON public.ai_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER ai_settings_updated_at BEFORE UPDATE ON public.ai_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.ai_settings (id, provider, model) VALUES (true, 'lovable', 'google/gemini-3.6-flash');