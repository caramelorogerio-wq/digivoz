CREATE TABLE public.termos_aprendidos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  termo text NOT NULL,
  correcao_de text,
  ocorrencias integer NOT NULL DEFAULT 1,
  origem text NOT NULL DEFAULT 'automatico',
  activo boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX termos_aprendidos_unicos
  ON public.termos_aprendidos (medico_id, lower(termo), lower(coalesce(correcao_de, '')));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.termos_aprendidos TO authenticated;
GRANT ALL ON public.termos_aprendidos TO service_role;

ALTER TABLE public.termos_aprendidos ENABLE ROW LEVEL SECURITY;

CREATE POLICY termos_all_own ON public.termos_aprendidos
  FOR ALL TO authenticated
  USING (auth.uid() = medico_id)
  WITH CHECK (auth.uid() = medico_id);

CREATE TRIGGER update_termos_aprendidos_updated_at
  BEFORE UPDATE ON public.termos_aprendidos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.medicos
  ADD COLUMN IF NOT EXISTS aprendizagem_activa boolean NOT NULL DEFAULT true;