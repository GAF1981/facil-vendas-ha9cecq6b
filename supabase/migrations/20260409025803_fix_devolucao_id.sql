-- Garante a sincronia de id_estoque_carro nas devoluções e reposições independente da sessão atual
CREATE OR REPLACE FUNCTION public.fix_id_estoque_carro_on_devolucao()
RETURNS trigger AS $$
DECLARE
  v_correct_id BIGINT;
BEGIN
  -- Procura o registro correspondente inserido há poucos segundos na tabela REPOSIÇÃO E DEVOLUÇÃO
  SELECT id_estoque_carro INTO v_correct_id
  FROM public."REPOSIÇÃO E DEVOLUÇÃO"
  WHERE produto_id = NEW.produto_id
    AND quantidade = NEW.quantidade
    AND funcionario_id = NEW.funcionario_id
    AND "TIPO" = 'DEVOLUCAO'
    AND created_at >= NOW() - INTERVAL '30 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_correct_id IS NOT NULL THEN
    NEW.id_estoque_carro := v_correct_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fix_id_estoque_carro_devolucao ON public."ESTOQUE CARRO: CARRO PARA O ESTOQUE";
CREATE TRIGGER trg_fix_id_estoque_carro_devolucao
  BEFORE INSERT ON public."ESTOQUE CARRO: CARRO PARA O ESTOQUE"
  FOR EACH ROW
  EXECUTE FUNCTION public.fix_id_estoque_carro_on_devolucao();

CREATE OR REPLACE FUNCTION public.fix_id_estoque_carro_on_reposicao()
RETURNS trigger AS $$
DECLARE
  v_correct_id BIGINT;
BEGIN
  -- Procura o registro correspondente inserido há poucos segundos na tabela REPOSIÇÃO E DEVOLUÇÃO
  SELECT id_estoque_carro INTO v_correct_id
  FROM public."REPOSIÇÃO E DEVOLUÇÃO"
  WHERE produto_id = NEW.produto_id
    AND quantidade = NEW.quantidade
    AND funcionario_id = NEW.funcionario_id
    AND "TIPO" = 'REPOSICAO'
    AND created_at >= NOW() - INTERVAL '30 seconds'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_correct_id IS NOT NULL THEN
    NEW.id_estoque_carro := v_correct_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_fix_id_estoque_carro_reposicao ON public."ESTOQUE CARRO: ESTOQUE PARA O CARRO";
CREATE TRIGGER trg_fix_id_estoque_carro_reposicao
  BEFORE INSERT ON public."ESTOQUE CARRO: ESTOQUE PARA O CARRO"
  FOR EACH ROW
  EXECUTE FUNCTION public.fix_id_estoque_carro_on_reposicao();

CREATE OR REPLACE FUNCTION public.sync_id_estoque_carro_from_reposicao_devolucao()
RETURNS trigger AS $$
BEGIN
  -- Atualiza o registro caso a tabela principal já tenha sido gravada previamente
  IF NEW."TIPO" = 'DEVOLUCAO' AND NEW.id_estoque_carro IS NOT NULL THEN
    UPDATE public."ESTOQUE CARRO: CARRO PARA O ESTOQUE"
    SET id_estoque_carro = NEW.id_estoque_carro
    WHERE produto_id = NEW.produto_id
      AND quantidade = NEW.quantidade
      AND funcionario_id = NEW.funcionario_id
      AND created_at >= NOW() - INTERVAL '30 seconds';
  ELSIF NEW."TIPO" = 'REPOSICAO' AND NEW.id_estoque_carro IS NOT NULL THEN
    UPDATE public."ESTOQUE CARRO: ESTOQUE PARA O CARRO"
    SET id_estoque_carro = NEW.id_estoque_carro
    WHERE produto_id = NEW.produto_id
      AND quantidade = NEW.quantidade
      AND funcionario_id = NEW.funcionario_id
      AND created_at >= NOW() - INTERVAL '30 seconds';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_id_estoque_carro ON public."REPOSIÇÃO E DEVOLUÇÃO";
CREATE TRIGGER trg_sync_id_estoque_carro
  AFTER INSERT ON public."REPOSIÇÃO E DEVOLUÇÃO"
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_id_estoque_carro_from_reposicao_devolucao();
