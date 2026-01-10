-- Update debitos_com_total_view to implement conditional monthly average logic
-- If media_mensal is 0 and valor_venda is > 0, calculate average as valor_venda / 30
CREATE OR REPLACE VIEW debitos_com_total_view AS
SELECT
    id,
    rota_id,
    pedido_id,
    data_acerto,
    hora_acerto,
    vendedor_nome,
    cliente_codigo,
    cliente_nome,
    rota,
    CASE
        WHEN (media_mensal = 0 OR media_mensal IS NULL) AND valor_venda > 0 THEN valor_venda / 30.0
        ELSE media_mensal
    END as media_mensal,
    valor_venda,
    desconto,
    saldo_a_pagar,
    valor_pago,
    debito,
    created_at,
    -- Window function to sum debt partitioning by client code
    SUM(debito) OVER (PARTITION BY cliente_codigo) as debito_total
FROM debitos_historico;
