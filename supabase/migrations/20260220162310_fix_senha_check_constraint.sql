ALTER TABLE "public"."FUNCIONARIOS" DROP CONSTRAINT IF EXISTS "senha_check";

ALTER TABLE "public"."FUNCIONARIOS" 
ADD CONSTRAINT "senha_check" 
CHECK (senha IS NULL OR senha = '' OR senha ~ '^[0-9]{4}'::text);
