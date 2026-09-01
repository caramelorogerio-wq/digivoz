REVOKE ALL ON FUNCTION public.apagar_relatorios_expirados() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.apagar_relatorios_expirados() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.apagar_relatorios_expirados() TO service_role;