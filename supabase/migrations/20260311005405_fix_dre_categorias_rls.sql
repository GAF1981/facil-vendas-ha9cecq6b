-- Drop the existing "ALL" policy that might be causing evaluation issues
DROP POLICY IF EXISTS "Enable all for authenticated users on dre_categorias" ON public.dre_categorias;

-- Ensure RLS is enabled
ALTER TABLE public.dre_categorias ENABLE ROW LEVEL SECURITY;

-- Create explicit CRUD policies for authenticated users
CREATE POLICY "Enable select for authenticated users on dre_categorias"
    ON public.dre_categorias FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for authenticated users on dre_categorias"
    ON public.dre_categorias FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Enable update for authenticated users on dre_categorias"
    ON public.dre_categorias FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Enable delete for authenticated users on dre_categorias"
    ON public.dre_categorias FOR DELETE TO authenticated USING (true);
