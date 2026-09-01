CREATE SCHEMA IF NOT EXISTS jobs;

-- Recriar a função no schema jobs
CREATE OR REPLACE FUNCTION jobs.apagar_relatorios_expirados()
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

REVOKE ALL ON FUNCTION jobs.apagar_relatorios_expirados() FROM PUBLIC;
REVOKE ALL ON FUNCTION jobs.apagar_relatorios_expirados() FROM authenticated;
GRANT EXECUTE ON FUNCTION jobs.apagar_relatorios_expirados() TO service_role;

-- Limpar função antiga em public
DROP FUNCTION IF EXISTS public.apagar_relatorios_expirados();