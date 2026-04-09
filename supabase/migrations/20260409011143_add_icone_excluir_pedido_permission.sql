DO $$
DECLARE
  s RECORD;
BEGIN
  -- Iterate over all existing distinct sectors
  FOR s IN SELECT DISTINCT setor FROM public.permissoes
  LOOP
    -- Insert the new permission for 'Ícone excluir pedido' ensuring idempotency
    INSERT INTO public.permissoes (setor, modulo, acesso)
    VALUES (s.setor, 'Ícone excluir pedido', true)
    ON CONFLICT (setor, modulo) DO NOTHING;
  END LOOP;
END $$;
