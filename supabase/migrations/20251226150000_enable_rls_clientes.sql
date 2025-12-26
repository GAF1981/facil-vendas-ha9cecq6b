-- Enable Row Level Security on the CLIENTES table
ALTER TABLE "public"."CLIENTES" ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
-- Policy for SELECT
CREATE POLICY "Enable read access for authenticated users" ON "public"."CLIENTES"
AS PERMISSIVE FOR SELECT
TO authenticated
USING (true);

-- Policy for INSERT
CREATE POLICY "Enable insert access for authenticated users" ON "public"."CLIENTES"
AS PERMISSIVE FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy for UPDATE
CREATE POLICY "Enable update access for authenticated users" ON "public"."CLIENTES"
AS PERMISSIVE FOR UPDATE
TO authenticated
USING (true);

-- Policy for DELETE
CREATE POLICY "Enable delete access for authenticated users" ON "public"."CLIENTES"
AS PERMISSIVE FOR DELETE
TO authenticated
USING (true);
