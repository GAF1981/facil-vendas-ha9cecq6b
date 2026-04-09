DO $$
DECLARE
  v_setor text;
BEGIN
  -- Insert the new permissions for all existing sectors
  FOR v_setor IN SELECT DISTINCT setor FROM public.permissoes
  LOOP
    INSERT INTO public.permissoes (setor, modulo, acesso)
    VALUES (v_setor, 'Ícone editar acerto', true)
    ON CONFLICT (setor, modulo) DO NOTHING;

    INSERT INTO public.permissoes (setor, modulo, acesso)
    VALUES (v_setor, 'Ícone editar pagamento', true)
    ON CONFLICT (setor, modulo) DO NOTHING;
  END LOOP;
END $$;
