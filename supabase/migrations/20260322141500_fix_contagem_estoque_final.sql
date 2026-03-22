DO $$
BEGIN
  -- Cria a tabela caso ela não exista
  CREATE TABLE IF NOT EXISTS public."CONTAGEM DE ESTOQUE FINAL" (
      id SERIAL PRIMARY KEY,
      session_id INTEGER,
      produto_id INTEGER,
      quantidade NUMERIC DEFAULT 0,
      valor_unitario_snapshot NUMERIC DEFAULT 0,
      created_at TIMESTAMPTZ DEFAULT NOW()
  );
END $$;

-- Concede privilégios necessários
GRANT ALL ON public."CONTAGEM DE ESTOQUE FINAL" TO authenticated;
GRANT ALL ON public."CONTAGEM DE ESTOQUE FINAL" TO anon;
GRANT ALL ON public."CONTAGEM DE ESTOQUE FINAL" TO service_role;

-- Ativa o Row Level Security
ALTER TABLE public."CONTAGEM DE ESTOQUE FINAL" ENABLE ROW LEVEL SECURITY;

-- Remove a política se já existir e cria novamente
DROP POLICY IF EXISTS "authenticated_all" ON public."CONTAGEM DE ESTOQUE FINAL";
CREATE POLICY "authenticated_all" ON public."CONTAGEM DE ESTOQUE FINAL"
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Força o recarregamento do cache do schema do PostgREST
NOTIFY pgrst, 'reload schema';
