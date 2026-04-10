DO $$
DECLARE
  pol record;
  t text;
  s text;
  tables text[] := ARRAY[
    'BANCO_DE_DADOS',
    'RECEBIMENTOS',
    'debitos_historico',
    'DESPESAS',
    'PENDENCIAS',
    'rota_motoqueiro_km',
    'notas_fiscais_emitidas',
    'acoes_cobranca',
    'acoes_cobranca_vencimentos',
    'fechamento_caixa',
    'PIX',
    'CLIENTES',
    'FUNCIONARIOS',
    'dividas_manuais',
    'dividas_manuais_acoes',
    'boletos',
    'PRODUTOS',
    'FORNECEDORES',
    'ROTA',
    'ROTA_ITEMS',
    'ESTOQUE CARRO AJUSTES',
    'ESTOQUE CARRO CONTAGEM',
    'ESTOQUE CARRO DIFERENÇAS',
    'ESTOQUE CARRO SALDO FINAL',
    'ESTOQUE CARRO SALDO INICIAL',
    'ESTOQUE CARRO: CARRO PARA O CLIENTE',
    'ESTOQUE CARRO: CARRO PARA O ESTOQUE',
    'ESTOQUE CARRO: CLIENTE PARA O CARRO',
    'ESTOQUE CARRO: ESTOQUE PARA O CARRO',
    'ESTOQUE GERAL AJUSTES',
    'ESTOQUE GERAL CARRO PARA ESTOQUE',
    'ESTOQUE GERAL COMPRAS',
    'ESTOQUE GERAL CONTAGEM',
    'ESTOQUE GERAL ESTOQUE PARA CARRO',
    'ESTOQUE GERAL SALDO INICIAL',
    'ESTOQUE GERAL SAÍDAS PERDAS',
    'ID ESTOQUE CARRO',
    'ID Inventário',
    'REPOSIÇÃO E DEVOLUÇÃO',
    'CONTAGEM DE ESTOQUE FINAL',
    'configuracoes',
    'inativar_clientes',
    'kits',
    'kit_items',
    'meta_excecoes',
    'metas_funcionarios',
    'metas_periodos',
    'NOTA_FISCAL',
    'pendencia_anotacoes',
    'permissoes',
    'RELATORIO_DE_ESTOQUE',
    'sessoes_inventario',
    'VEICULOS',
    'AJUSTE_SALDO_INICIAL',
    'AÇOES DE COBRANÇA_BACKUP',
    'DATAS DE INVENTÁRIO',
    'CRIAR_NOVA_ROTA',
    'brinde',
    'dre_categorias',
    'dre_lancamentos',
    'system_logs'
  ];
BEGIN
  -- Drop all existing policies for all tables in the public schema to ensure a clean slate
  FOR pol IN 
    SELECT schemaname, tablename, policyname 
    FROM pg_policies 
    WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;

  -- Recreate a fully permissive policy for all tables
  FOREACH t IN ARRAY tables
  LOOP
    BEGIN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      EXECUTE format('CREATE POLICY "Enable all for authenticated users" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t);
      EXECUTE format('CREATE POLICY "Enable all for anon users" ON public.%I FOR ALL TO anon USING (true) WITH CHECK (true);', t);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skipping table % due to error: %', t, SQLERRM;
    END;
  END LOOP;

  -- Insert specific permissions for all existing sectors
  FOR s IN SELECT DISTINCT setor FROM permissoes
  LOOP
    INSERT INTO permissoes (setor, modulo, acesso) VALUES (s, 'Card Estoque Carro', true) ON CONFLICT (setor, modulo) DO NOTHING;
    INSERT INTO permissoes (setor, modulo, acesso) VALUES (s, 'Botão Editar Acerto', true) ON CONFLICT (setor, modulo) DO NOTHING;
    INSERT INTO permissoes (setor, modulo, acesso) VALUES (s, 'Edição de Acerto', true) ON CONFLICT (setor, modulo) DO NOTHING;
    INSERT INTO permissoes (setor, modulo, acesso) VALUES (s, 'Estoque Carro', true) ON CONFLICT (setor, modulo) DO NOTHING;
  END LOOP;
END $$;
