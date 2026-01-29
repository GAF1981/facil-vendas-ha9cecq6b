ALTER TABLE public."RECEBIMENTOS" ADD COLUMN rota_id INTEGER REFERENCES public."ROTA"(id);
CREATE INDEX idx_recebimentos_rota_id ON public."RECEBIMENTOS"(rota_id);

