ALTER TABLE public."CLIENTES" ADD COLUMN IF NOT EXISTS tipo_venda TEXT DEFAULT 'consignado';
UPDATE public."CLIENTES" SET tipo_venda = 'consignado' WHERE tipo_venda IS NULL;

ALTER TABLE public."DESPESAS" ALTER COLUMN "Data" SET DEFAULT now();

