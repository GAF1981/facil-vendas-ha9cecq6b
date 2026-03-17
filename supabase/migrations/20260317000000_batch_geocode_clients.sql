-- Migration to ensure latitude and longitude exist, set up RLS

ALTER TABLE public."CLIENTES" ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 8);
ALTER TABLE public."CLIENTES" ADD COLUMN IF NOT EXISTS longitude NUMERIC(11, 8);
ALTER TABLE public."CLIENTES" ADD COLUMN IF NOT EXISTS favorito BOOLEAN DEFAULT FALSE;

DO $$
BEGIN
    -- Ensure RLS allows authenticated users to SELECT, INSERT, UPDATE CLIENTES
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'CLIENTES' AND policyname = 'authenticated_select_clientes'
    ) THEN
        CREATE POLICY "authenticated_select_clientes" ON public."CLIENTES" FOR SELECT TO authenticated USING (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'CLIENTES' AND policyname = 'authenticated_insert_clientes'
    ) THEN
        CREATE POLICY "authenticated_insert_clientes" ON public."CLIENTES" FOR INSERT TO authenticated WITH CHECK (true);
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'CLIENTES' AND policyname = 'authenticated_update_clientes'
    ) THEN
        CREATE POLICY "authenticated_update_clientes" ON public."CLIENTES" FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
    END IF;
END $$;
