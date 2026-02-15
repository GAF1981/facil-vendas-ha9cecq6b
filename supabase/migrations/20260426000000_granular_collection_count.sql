-- Add columns to target specific installments in collection actions
ALTER TABLE "acoes_cobranca" ADD COLUMN IF NOT EXISTS "target_vencimento" TIMESTAMP WITH TIME ZONE;
ALTER TABLE "acoes_cobranca" ADD COLUMN IF NOT EXISTS "target_forma_pagamento" TEXT;

-- Create a view to aggregate collection action counts per installment
CREATE OR REPLACE VIEW view_collection_action_counts AS
SELECT 
    pedido_id, 
    target_vencimento, 
    target_forma_pagamento, 
    COUNT(*) as action_count
FROM acoes_cobranca
GROUP BY pedido_id, target_vencimento, target_forma_pagamento;

-- Ensure permissions
GRANT SELECT ON view_collection_action_counts TO authenticated;
