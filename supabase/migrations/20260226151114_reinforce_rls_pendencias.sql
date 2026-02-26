-- Reinforce RLS on PENDENCIAS table and ensure SELECT access for authenticated users
ALTER TABLE public."PENDENCIAS" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public."PENDENCIAS";
CREATE POLICY "Enable read access for authenticated users"
  ON public."PENDENCIAS"
  FOR SELECT
  TO authenticated
  USING (true);
