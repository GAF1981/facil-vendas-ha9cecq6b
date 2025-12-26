-- Add foto_url column to FUNCIONARIOS table
ALTER TABLE "public"."FUNCIONARIOS" ADD COLUMN IF NOT EXISTS "foto_url" TEXT;

-- Drop the existing function to update its return signature
DROP FUNCTION IF EXISTS verify_employee_credentials(TEXT, TEXT);

-- Recreate the function with the new return column
CREATE OR REPLACE FUNCTION verify_employee_credentials(p_email TEXT, p_senha TEXT)
RETURNS TABLE (
  id BIGINT,
  email TEXT,
  nome_completo TEXT,
  setor TEXT,
  foto_url TEXT
) 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT f.id, f.email, f.nome_completo, f.setor, f.foto_url
  FROM "public"."FUNCIONARIOS" f
  WHERE f.email = p_email AND f.senha = p_senha
  LIMIT 1;
END;
$$;

-- Grant execute permissions again just to be sure
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION verify_employee_credentials(TEXT, TEXT) TO service_role;
