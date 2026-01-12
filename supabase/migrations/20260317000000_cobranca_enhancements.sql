-- Create a view to get the latest collection action per order
CREATE OR REPLACE VIEW view_latest_collection_actions AS
WITH latest_actions AS (
    SELECT DISTINCT ON (pedido_id)
        id,
        pedido_id,
        acao,
        data_acao,
        nova_data_combinada,
        funcionario_nome,
        funcionario_id,
        cliente_id,
        cliente_nome,
        created_at
    FROM public.acoes_cobranca
    ORDER BY pedido_id, data_acao DESC, created_at DESC
)
SELECT
    la.id AS action_id,
    la.pedido_id,
    la.acao,
    la.data_acao,
    la.nova_data_combinada,
    la.funcionario_nome,
    la.cliente_id,
    acv.id AS installment_id,
    acv.vencimento AS installment_vencimento,
    acv.valor AS installment_valor,
    acv.forma_pagamento AS installment_forma_pagamento
FROM latest_actions la
JOIN public.acoes_cobranca_vencimentos acv ON la.id = acv.acao_cobranca_id;

-- Ensure permissions
GRANT SELECT ON view_latest_collection_actions TO authenticated;
