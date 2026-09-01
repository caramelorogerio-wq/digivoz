-- 1. Adicionar coluna de expiração aos relatórios
ALTER TABLE public.relatorios_transcritos ADD COLUMN IF NOT EXISTS expira_em TIMESTAMP WITH TIME ZONE;

-- 2. Tabela de configurações por médico
CREATE TABLE IF NOT EXISTS public.configuracoes_medico (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  medico_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  prazo_reter_dias INTEGER NOT NULL DEFAULT 90,
  base_prazo TEXT NOT NULL DEFAULT 'ultima_edicao' CHECK (base_prazo IN ('criacao', 'ultima_edicao')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (medico_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.configuracoes_medico TO authenticated;
GRANT ALL ON public.configuracoes_medico TO service_role;

ALTER TABLE public.configuracoes_medico ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Medicos gerem as suas configuracoes"
ON public.configuracoes_medico
FOR ALL
TO authenticated
USING (auth.uid() = medico_id)
WITH CHECK (auth.uid() = medico_id);

-- Trigger updated_at para configuracoes_medico
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER configuracoes_medico_updated_at
BEFORE UPDATE ON public.configuracoes_medico
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3. Função para apagar relatórios expirados (corre como service_role no cron)
CREATE OR REPLACE FUNCTION public.apagar_relatorios_expirados()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM public.relatorios_transcritos
  WHERE expira_em IS NOT NULL
    AND expira_em < now();
END;
$$;
