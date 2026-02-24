INSERT INTO PERMISSOES (setor, modulo, acesso)
SELECT DISTINCT setor, 'Relatório Meta', 
  CASE WHEN setor IN ('Administrador', 'Gerente') THEN TRUE ELSE FALSE END
FROM PERMISSOES
ON CONFLICT (setor, modulo) DO NOTHING;
