-- Remove foreign key "BANCO_DE_DADOS_session_id_fkey" to allow session_id to hold IDs from "ID Inventário"
-- which fixes the violation error when a return movement triggers a record insert from the General Inventory side.
ALTER TABLE public."BANCO_DE_DADOS" DROP CONSTRAINT IF EXISTS "BANCO_DE_DADOS_session_id_fkey";
