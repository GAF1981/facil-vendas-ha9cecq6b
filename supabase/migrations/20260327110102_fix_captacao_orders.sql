DO $
BEGIN
  -- Update FORMA to Captação for orders 3026 and 3035 if they were saved as Acerto
  UPDATE public."BANCO_DE_DADOS"
  SET "FORMA" = REPLACE("FORMA", 'Acerto', 'Captação')
  WHERE "NÚMERO DO PEDIDO" IN (3026, 3035) AND "FORMA" ILIKE '%Acerto%';

  -- Also handle cases where FORMA might be just empty or null
  UPDATE public."BANCO_DE_DADOS"
  SET "FORMA" = 'Captação'
  WHERE "NÚMERO DO PEDIDO" IN (3026, 3035) AND ("FORMA" IS NULL OR "FORMA" = '');
END $;
