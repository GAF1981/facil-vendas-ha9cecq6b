-- Delete specific Pendencia records as requested by the financial team
DELETE FROM "PENDENCIAS"
WHERE cliente_id IN (3004, 3006, 67);
