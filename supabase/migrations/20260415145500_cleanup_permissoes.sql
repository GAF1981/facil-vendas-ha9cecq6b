DO $$
DECLARE
  r RECORD;
BEGIN
  -- Limpeza e unificação das permissões de ícone de edição de acerto
  FOR r IN 
    SELECT setor FROM public.permissoes WHERE modulo = 'Ícone editar acerto'
  LOOP
    IF EXISTS (SELECT 1 FROM public.permissoes WHERE setor = r.setor AND modulo = 'Ícone Editar Acerto') THEN
      DELETE FROM public.permissoes WHERE setor = r.setor AND modulo = 'Ícone editar acerto';
    ELSE
      UPDATE public.permissoes SET modulo = 'Ícone Editar Acerto' WHERE setor = r.setor AND modulo = 'Ícone editar acerto';
    END IF;
  END LOOP;
END $$;
