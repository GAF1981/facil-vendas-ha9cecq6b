-- Garante que os setores administrativos tenham acesso ao novo módulo de Indicadores
INSERT INTO permissoes (setor, modulo, acesso) 
VALUES ('Administrador', 'Indicadores', true) 
ON CONFLICT (setor, modulo) DO NOTHING;

INSERT INTO permissoes (setor, modulo, acesso) 
VALUES ('Gerente', 'Indicadores', true) 
ON CONFLICT (setor, modulo) DO NOTHING;
