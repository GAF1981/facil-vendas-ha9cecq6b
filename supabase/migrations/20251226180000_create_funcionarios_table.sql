CREATE TABLE IF NOT EXISTS "public"."FUNCIONARIOS" (
    "id" SERIAL PRIMARY KEY,
    "nome_completo" TEXT NOT NULL,
    "apelido" TEXT,
    "cpf" TEXT,
    "email" TEXT NOT NULL,
    "setor" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT email_check CHECK (email ~* '^.+@.+$')
);

ALTER TABLE "public"."FUNCIONARIOS" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all users" ON "public"."FUNCIONARIOS"
AS PERMISSIVE FOR SELECT
TO public
USING (true);

CREATE POLICY "Enable insert access for all users" ON "public"."FUNCIONARIOS"
AS PERMISSIVE FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Enable update access for all users" ON "public"."FUNCIONARIOS"
AS PERMISSIVE FOR UPDATE
TO public
USING (true);

CREATE POLICY "Enable delete access for all users" ON "public"."FUNCIONARIOS"
AS PERMISSIVE FOR DELETE
TO public
USING (true);
