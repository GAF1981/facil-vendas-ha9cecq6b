DO $$
BEGIN
  -- Insert the new permissions for all existing sectors if not exist
  INSERT INTO public.permissoes (setor, modulo, acesso)
  SELECT DISTINCT p.setor, m, false
  FROM (SELECT DISTINCT setor FROM public.permissoes) p
  CROSS JOIN UNNEST(ARRAY[
      'Dívida Manual', 
      'Quitar Dívida', 
      'E-mail Seguro', 
      'Confirmação'
  ]) AS m
  ON CONFLICT (setor, modulo) DO NOTHING;

  -- Ensure Administrador has them enabled by default
  UPDATE public.permissoes
  SET acesso = true
  WHERE setor = 'Administrador' AND modulo IN (
      'Dívida Manual', 
      'Quitar Dívida', 
      'E-mail Seguro', 
      'Confirmação'
  );
END $$;
