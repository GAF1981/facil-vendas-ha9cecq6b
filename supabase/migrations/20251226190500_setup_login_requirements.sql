-- Ensure the senha column exists and has the correct constraint
ALTER TABLE "public"."FUNCIONARIOS" ADD COLUMN IF NOT EXISTS "senha" TEXT NOT NULL DEFAULT '0000';

-- Drop constraint if exists to ensure we can recreate it or it matches
ALTER TABLE "public"."FUNCIONARIOS" DROP CONSTRAINT IF EXISTS "senha_check";
ALTER TABLE "public"."FUNCIONARIOS" ADD CONSTRAINT "senha_check" CHECK (senha ~ '^\d{4}$');

-- Insert the Administrator account as requested
INSERT INTO "public"."FUNCIONARIOS" (email, senha, nome_completo, setor, cpf)
VALUES ('0000@gmail.com', '0000', 'Administrador', 'Financeiro', '000.000.000-00')
ON CONFLICT (id) DO NOTHING;

-- If email is unique constraint exists, handle it (assuming email is unique from context or we rely on ID)
-- Let's ensure we don't have duplicate emails if possible, but basic insert is fine for this task.

-- Create a secure function to verify credentials
-- This allows the frontend to check credentials without SELECT permission on the senha column
CREATE OR REPLACE FUNCTION verify_employee_credentials(p_email TEXT, p_senha TEXT)
RETURNS TABLE (
  id BIGINT,
  email TEXT,
  nome_completo TEXT,
  setor TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.email, f.nome_completo, f.setor
  FROM "public"."FUNCIONARIOS" f
  WHERE f.email = p_email AND f.senha = p_senha
  LIMIT 1;
END;
$$;

-- Grant execute permission to anon and authenticated users
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO service_role;
