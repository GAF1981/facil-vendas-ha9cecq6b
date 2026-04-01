CREATE OR REPLACE FUNCTION public.delete_full_order(p_order_id bigint)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  DELETE FROM "BANCO_DE_DADOS" WHERE "NÚMERO DO PEDIDO" = p_order_id;
  DELETE FROM "RECEBIMENTOS" WHERE venda_id = p_order_id;
  DELETE FROM "debitos_historico" WHERE pedido_id = p_order_id;
  DELETE FROM "RELATORIO_DE_ESTOQUE" WHERE numero_pedido = p_order_id;
  DELETE FROM "notas_fiscais_emitidas" WHERE pedido_id = p_order_id;
  DELETE FROM "inativar_clientes" WHERE pedido_id = p_order_id;
  DELETE FROM "AJUSTE_SALDO_INICIAL" WHERE numero_pedido = p_order_id;
  DELETE FROM "AÇOES DE COBRANÇA_BACKUP" WHERE "NÚMERO DO PEDIDO" = p_order_id;
  DELETE FROM "acoes_cobranca" WHERE pedido_id = p_order_id;
  DELETE FROM "ESTOQUE CARRO: CARRO PARA O CLIENTE" WHERE pedido = p_order_id;
  DELETE FROM "ESTOQUE CARRO: CLIENTE PARA O CARRO" WHERE pedido = p_order_id;
END;
$function$;
