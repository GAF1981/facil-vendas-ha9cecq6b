CREATE TABLE "CONTAGEM DE ESTOQUE FINAL" (
  "id" SERIAL PRIMARY KEY,
  "produto_id" INTEGER REFERENCES "PRODUTOS"("ID") NOT NULL,
  "quantidade" NUMERIC NOT NULL,
  "session_id" INTEGER REFERENCES "DATAS DE INVENTÁRIO"("ID INVENTÁRIO"),
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "valor_unitario_snapshot" NUMERIC
);

-- Enable RLS
ALTER TABLE "CONTAGEM DE ESTOQUE FINAL" ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users
CREATE POLICY "Enable all for authenticated users" ON "CONTAGEM DE ESTOQUE FINAL"
    FOR ALL
    TO authenticated
    USING (true)
    WITH CHECK (true);
