ALTER TABLE public.dre_lancamentos ADD COLUMN IF NOT EXISTS recorrente BOOLEAN NOT NULL DEFAULT false;
