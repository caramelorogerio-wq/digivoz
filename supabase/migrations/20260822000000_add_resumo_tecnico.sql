ALTER TABLE public.relatorios_transcritos
  ADD COLUMN IF NOT EXISTS fragmentos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS blocos INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS seccionado BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS inclusao TEXT NOT NULL DEFAULT 'total',
  ADD COLUMN IF NOT EXISTS codigo_faturacao TEXT NOT NULL DEFAULT '31057';

ALTER TABLE public.relatorios_transcritos
  DROP CONSTRAINT IF EXISTS relatorios_inclusao_check;

ALTER TABLE public.relatorios_transcritos
  ADD CONSTRAINT relatorios_inclusao_check
  CHECK (inclusao IN ('total', 'reserva'));

ALTER TABLE public.relatorios_transcritos
  DROP CONSTRAINT IF EXISTS relatorios_codigo_faturacao_check;

ALTER TABLE public.relatorios_transcritos
  ADD CONSTRAINT relatorios_codigo_faturacao_check
  CHECK (codigo_faturacao IN ('31057', '31077'));