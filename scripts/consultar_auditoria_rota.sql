SELECT 
    sl.created_at AS data_hora,
    f.nome_completo AS usuario_responsavel,
    sl.type AS tipo_acao,
    sl.description AS descricao,
    sl.meta AS detalhes
FROM 
    public.system_logs sl
LEFT JOIN 
    public."FUNCIONARIOS" f ON sl.user_id = f.id
WHERE 
    (sl.description ILIKE '%rota%' AND (sl.description ILIKE '%52%' OR sl.description ILIKE '%53%'))
    OR sl.type ILIKE '%rota%'
ORDER BY 
    sl.created_at DESC
LIMIT 100;

SELECT 
    id AS rota_id,
    data_inicio,
    data_fim
FROM 
    public."ROTA"
WHERE 
    id IN (52, 53)
ORDER BY 
    id;
