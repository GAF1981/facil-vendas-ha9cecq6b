-- Migration to change setor column to array of text to support multiple roles
-- Assuming existing data is simple text, converting to single-element array
ALTER TABLE "public"."FUNCIONARIOS" 
ALTER COLUMN "setor" TYPE text[] 
USING CASE 
    WHEN setor IS NULL THEN NULL 
    ELSE string_to_array(setor, ',') 
END;

-- Update the default value if any (removing default or setting to empty array)
ALTER TABLE "public"."FUNCIONARIOS" ALTER COLUMN "setor" DROP DEFAULT;

-- Verify RLS policies might need adjustment if they rely on exact match of setor, 
-- but most policies seem to be permissive or id-based. 
-- If there were policies like "auth.uid() = id", they are fine.
