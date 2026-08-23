ALTER TABLE public.relatorios_transcritos
  ADD COLUMN IF NOT EXISTS fragmentos integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS blocos integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS seccionado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS inclusao text NOT NULL DEFAULT 'total',
  ADD COLUMN IF NOT EXISTS codigo_faturacao text NOT NULL DEFAULT '31057';

ALTER TABLE public.relatorios_transcritos
  DROP CONSTRAINT IF EXISTS relatorios_inclusao_check,
  DROP CONSTRAINT IF EXISTS relatorios_codigo_check;

ALTER TABLE public.relatorios_transcritos
  ADD CONSTRAINT relatorios_inclusao_check CHECK (inclusao IN ('total','reserva')),
  ADD CONSTRAINT relatorios_codigo_check CHECK (codigo_faturacao IN ('31057','31077'));