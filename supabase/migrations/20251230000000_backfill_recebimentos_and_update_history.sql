-- Migration to backfill RECEBIMENTOS table from BANCO_DE_DADOS JSON column
-- This ensures we can switch to using RECEBIMENTOS as the single source of truth for payments

INSERT INTO public."RECEBIMENTOS" (venda_id, cliente_id, funcionario_id, forma_pagamento, valor_pago, data_pagamento)
WITH unique_orders AS (
  SELECT DISTINCT ON ("NÚMERO DO PEDIDO")
    "NÚMERO DO PEDIDO",
    "CÓDIGO DO CLIENTE",
    "CODIGO FUNCIONARIO",
    "DETALHES_PAGAMENTO",
    "DATA DO ACERTO",
    "HORA DO ACERTO"
  FROM public."BANCO_DE_DADOS"
  WHERE "DETALHES_PAGAMENTO" IS NOT NULL
  AND jsonb_typeof("DETALHES_PAGAMENTO"::jsonb) = 'array'
)
SELECT
  uo."NÚMERO DO PEDIDO",
  uo."CÓDIGO DO CLIENTE",
  uo."CODIGO FUNCIONARIO",
  p->>'method',
  COALESCE((p->>'paidValue')::numeric, (p->>'value')::numeric, 0),
  CASE
    WHEN uo."DATA DO ACERTO" IS NOT NULL AND uo."HORA DO ACERTO" IS NOT NULL
    THEN (uo."DATA DO ACERTO" || ' ' || uo."HORA DO ACERTO")::timestamp
    ELSE NOW()
  END
FROM unique_orders uo
CROSS JOIN LATERAL jsonb_array_elements(uo."DETALHES_PAGAMENTO"::jsonb) as p
WHERE NOT EXISTS (
  SELECT 1 FROM public."RECEBIMENTOS" r WHERE r.venda_id = uo."NÚMERO DO PEDIDO"
);
