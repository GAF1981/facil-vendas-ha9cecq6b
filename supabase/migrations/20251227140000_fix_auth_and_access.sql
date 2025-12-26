-- Fix verify_employee_credentials function to return more details
DROP FUNCTION IF EXISTS verify_employee_credentials(TEXT, TEXT);

CREATE OR REPLACE FUNCTION verify_employee_credentials(p_email TEXT, p_senha TEXT)
RETURNS TABLE (
  id BIGINT,
  nome_completo TEXT,
  apelido TEXT,
  cpf TEXT,
  email TEXT,
  setor TEXT,
  foto_url TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.nome_completo, f.apelido, f.cpf, f.email, f.setor, f.foto_url
  FROM "public"."FUNCIONARIOS" f
  WHERE f.email = p_email AND f.senha = p_senha
  LIMIT 1;
END;
$$;

-- Grant permissions for the function
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO service_role;

-- Enable RLS on tables if not already enabled
ALTER TABLE "public"."CLIENTES" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."FUNCIONARIOS" ENABLE ROW LEVEL SECURITY;

-- Allow public access to data since we are using custom auth (App Level Security)
-- This allows the application to read/write data when the user is logged in via the custom flow (which is effectively anon from DB perspective)
-- Note: In a production environment with Supabase Auth, you would use auth.uid() checks.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'CLIENTES' AND policyname = 'Allow public access to CLIENTES'
    ) THEN
        CREATE POLICY "Allow public access to CLIENTES" ON "public"."CLIENTES"
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'FUNCIONARIOS' AND policyname = 'Allow public access to FUNCIONARIOS'
    ) THEN
        CREATE POLICY "Allow public access to FUNCIONARIOS" ON "public"."FUNCIONARIOS"
        FOR ALL
        TO public
        USING (true)
        WITH CHECK (true);
    END IF;
END
$$;
