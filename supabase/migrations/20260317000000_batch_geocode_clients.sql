-- Migration to ensure latitude and longitude exist, set up RLS, and batch geocode

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

-- Batch Geocoding logic using pg_sleep to respect API limits
DO $$
DECLARE
    r RECORD;
    url TEXT;
    json_data JSONB;
    lat NUMERIC;
    lon NUMERIC;
    encoded_addr TEXT;
    http_ext_exists BOOLEAN;
BEGIN
    BEGIN
        CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
        http_ext_exists := TRUE;
    EXCEPTION WHEN OTHERS THEN
        http_ext_exists := FALSE;
    END;

    IF http_ext_exists THEN
        FOR r IN 
            SELECT "CODIGO", "ENDEREÇO", "BAIRRO", "MUNICÍPIO" 
            FROM "CLIENTES" 
            WHERE ("TIPO DE CLIENTE" = 'ATIVO' OR situacao = 'ATIVO')
              AND (latitude IS NULL OR longitude IS NULL OR latitude = 0 OR longitude = 0)
              AND "ENDEREÇO" IS NOT NULL
              AND "MUNICÍPIO" IS NOT NULL
            LIMIT 100 -- Process in smaller batches per migration to avoid timeouts
        LOOP
            encoded_addr := replace(r."ENDEREÇO" || ', ' || COALESCE(r."BAIRRO", '') || ', ' || r."MUNICÍPIO", ' ', '+');
            encoded_addr := replace(encoded_addr, ',', '%2C');
            
            url := 'https://nominatim.openstreetmap.org/search?format=json&q=' || encoded_addr;
            
            BEGIN
                PERFORM pg_sleep(1.2); -- Respect Nominatim limits
                
                EXECUTE 'SELECT content::jsonb FROM extensions.http_get($1) WHERE status = 200'
                INTO json_data
                USING url;
                
                IF json_data IS NOT NULL AND jsonb_typeof(json_data) = 'array' AND jsonb_array_length(json_data) > 0 THEN
                    lat := (json_data->0->>'lat')::NUMERIC;
                    lon := (json_data->0->>'lon')::NUMERIC;
                    
                    UPDATE "CLIENTES" 
                    SET latitude = lat, longitude = lon 
                    WHERE "CODIGO" = r."CODIGO";
                END IF;
            EXCEPTION WHEN OTHERS THEN
                -- Ignore errors for individual rows
            END;
        END LOOP;
    END IF;
END $$;
