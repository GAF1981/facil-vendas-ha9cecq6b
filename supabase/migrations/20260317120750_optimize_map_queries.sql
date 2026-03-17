-- Optimization for Geographic queries on CLIENTES
CREATE INDEX IF NOT EXISTS idx_clientes_lat_lon 
ON public."CLIENTES" (latitude, longitude) 
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
