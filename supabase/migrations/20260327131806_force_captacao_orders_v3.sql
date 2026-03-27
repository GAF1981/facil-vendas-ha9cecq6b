DO $$
BEGIN
  -- Substitui qualquer variação da palavra 'Acerto' (case-insensitive) por 'Captação'
  UPDATE public."BANCO_DE_DADOS"
  SET "FORMA" = regexp_replace(COALESCE("FORMA", ''), 'acerto', 'Captação', 'ig')
  WHERE "NÚMERO DO PEDIDO" IN (3026, 3035);

  -- Se a string resultante ficar vazia, define apenas como 'Captação'
  UPDATE public."BANCO_DE_DADOS"
  SET "FORMA" = 'Captação'
  WHERE "NÚMERO DO PEDIDO" IN (3026, 3035) AND TRIM(COALESCE("FORMA", '')) = '';

  -- Caso a palavra 'Captação' ainda não esteja no campo, nós a forçamos no início
  UPDATE public."BANCO_DE_DADOS"
  SET "FORMA" = 'Captação | ' || "FORMA"
  WHERE "NÚMERO DO PEDIDO" IN (3026, 3035) AND "FORMA" NOT ILIKE '%Captação%';
END $$;
