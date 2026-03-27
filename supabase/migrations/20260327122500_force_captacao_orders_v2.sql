DO $$
BEGIN
  -- Força os pedidos 3026 e 3035 a terem a string 'Captação' na coluna FORMA
  UPDATE public."BANCO_DE_DADOS"
  SET "FORMA" = CASE 
      WHEN "FORMA" ILIKE 'Acerto | %' THEN REPLACE("FORMA", 'Acerto | ', 'Captação | ')
      WHEN "FORMA" ILIKE '%Acerto%' THEN REPLACE("FORMA", 'Acerto', 'Captação')
      WHEN "FORMA" IS NULL OR "FORMA" = '' THEN 'Captação'
      ELSE 'Captação | ' || "FORMA"
  END
  WHERE "NÚMERO DO PEDIDO" IN (3026, 3035) 
  AND "FORMA" NOT ILIKE '%Captação%';
END $$;
