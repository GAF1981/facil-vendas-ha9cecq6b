-- Add new specific button permissions and new modules
INSERT INTO public.permissoes (setor, modulo, acesso)
SELECT DISTINCT setor, m, false
FROM public.permissoes, UNNEST(ARRAY[
    'Indicadores', 
    'DRE', 
    'Botão Iniciar Rota', 
    'Botão Finalizar Estoque Carro', 
    'Botão Reset Estoque Carro', 
    'Botão Finalizar Inventário', 
    'Botão Reset Inventário'
]) AS m
ON CONFLICT (setor, modulo) DO NOTHING;

-- Grant access to Administrador by default for all new modules
UPDATE public.permissoes
SET acesso = true
WHERE setor = 'Administrador' AND modulo IN (
    'Indicadores', 
    'DRE', 
    'Botão Iniciar Rota', 
    'Botão Finalizar Estoque Carro', 
    'Botão Reset Estoque Carro', 
    'Botão Finalizar Inventário', 
    'Botão Reset Inventário'
);
