CREATE TABLE public.medicos (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL DEFAULT '',
  email TEXT,
  cedula TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.medicos TO authenticated;
GRANT ALL ON public.medicos TO service_role;
ALTER TABLE public.medicos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "medicos_select_own" ON public.medicos FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "medicos_insert_own" ON public.medicos FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "medicos_update_own" ON public.medicos FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.pacientes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  numero_processo TEXT,
  data_nascimento DATE,
  notas TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX pacientes_medico_id_idx ON public.pacientes(medico_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.pacientes TO authenticated;
GRANT ALL ON public.pacientes TO service_role;
ALTER TABLE public.pacientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pacientes_all_own" ON public.pacientes FOR ALL TO authenticated
  USING (auth.uid() = medico_id) WITH CHECK (auth.uid() = medico_id);

CREATE TABLE public.relatorios_transcritos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  medico_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  paciente_id UUID REFERENCES public.pacientes(id) ON DELETE SET NULL,
  titulo TEXT NOT NULL DEFAULT 'Relatório sem título',
  texto TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX relatorios_medico_id_idx ON public.relatorios_transcritos(medico_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.relatorios_transcritos TO authenticated;
GRANT ALL ON public.relatorios_transcritos TO service_role;
ALTER TABLE public.relatorios_transcritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "relatorios_all_own" ON public.relatorios_transcritos FOR ALL TO authenticated
  USING (auth.uid() = medico_id) WITH CHECK (auth.uid() = medico_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER medicos_updated_at BEFORE UPDATE ON public.medicos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER pacientes_updated_at BEFORE UPDATE ON public.pacientes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER relatorios_updated_at BEFORE UPDATE ON public.relatorios_transcritos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.medicos (id, nome, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', NEW.raw_user_meta_data ->> 'full_name', ''), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();