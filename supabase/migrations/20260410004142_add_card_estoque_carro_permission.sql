DO $$
DECLARE
  v_setor text;
BEGIN
  -- Percorre todos os setores existentes na tabela de permissões
  FOR v_setor IN SELECT DISTINCT setor FROM public.permissoes LOOP
    
    -- Insere a permissão para o Card Estoque Carro caso não exista
    IF NOT EXISTS (SELECT 1 FROM public.permissoes WHERE setor = v_setor AND modulo = 'Card Estoque Carro') THEN
      INSERT INTO public.permissoes (setor, modulo, acesso) VALUES (v_setor, 'Card Estoque Carro', true);
    END IF;

    -- Garante que a permissão de edição de acerto também esteja presente nos setores
    IF NOT EXISTS (SELECT 1 FROM public.permissoes WHERE setor = v_setor AND modulo = 'Ícone Editar Acerto') THEN
      INSERT INTO public.permissoes (setor, modulo, acesso) VALUES (v_setor, 'Ícone Editar Acerto', true);
    END IF;

  END LOOP;
END $$;
