CREATE TABLE IF NOT EXISTS public.metas_funcionarios (
    id SERIAL PRIMARY KEY,
    funcionario_id INTEGER NOT NULL REFERENCES public."FUNCIONARIOS"(id) ON DELETE CASCADE,
    meta_diaria INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(funcionario_id)
);

ALTER TABLE public.metas_funcionarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for authenticated users" ON public.metas_funcionarios
AS PERMISSIVE FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
