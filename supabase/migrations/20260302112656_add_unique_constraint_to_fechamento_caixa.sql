-- Add unique constraint to fechamento_caixa to support upserts
-- This allows updating an existing cashier closing record for a specific route and employee
ALTER TABLE public.fechamento_caixa 
ADD CONSTRAINT fechamento_caixa_rota_id_funcionario_id_key UNIQUE (rota_id, funcionario_id);
