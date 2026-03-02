DO $$
BEGIN
    -- Update Order 778
    UPDATE "BANCO_DE_DADOS" 
    SET "DESCONTO POR GRUPO" = '263,77' 
    WHERE "NÚMERO DO PEDIDO" = 778;

    -- Update Order 708
    UPDATE "BANCO_DE_DADOS" 
    SET "DESCONTO POR GRUPO" = '167,62' 
    WHERE "NÚMERO DO PEDIDO" = 708;

    -- Update Order 609
    UPDATE "BANCO_DE_DADOS" 
    SET "DESCONTO POR GRUPO" = '187,10' 
    WHERE "NÚMERO DO PEDIDO" = 609;

    -- Update Order 776
    UPDATE "BANCO_DE_DADOS" 
    SET "DESCONTO POR GRUPO" = '208,11' 
    WHERE "NÚMERO DO PEDIDO" = 776;

    -- Recalculate debt history for the affected orders
    PERFORM public.update_debito_historico_order(778);
    PERFORM public.update_debito_historico_order(708);
    PERFORM public.update_debito_historico_order(609);
    PERFORM public.update_debito_historico_order(776);
END $$;
