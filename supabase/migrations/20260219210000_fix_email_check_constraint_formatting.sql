-- Fix the email_check constraint formatting to avoid syntax errors in generated types
-- Dropping the constraint first to ensure clean state
ALTER TABLE "public"."FUNCIONARIOS" DROP CONSTRAINT IF EXISTS "email_check";

-- Re-adding the constraint on a single line to prevent newlines in generated comments
ALTER TABLE "public"."FUNCIONARIOS" ADD CONSTRAINT "email_check" CHECK (email ~* '^.+@.+');
