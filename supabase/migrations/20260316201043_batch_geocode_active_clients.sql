-- Migration to batch geocode active clients missing coordinates

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
    -- Check if http extension can be created/exists to allow making requests
    BEGIN
        CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
        http_ext_exists := TRUE;
    EXCEPTION WHEN OTHERS THEN
        http_ext_exists := FALSE;
        RAISE NOTICE 'HTTP extension not available. Skipping automatic geocoding in migration.';
    END;

    IF http_ext_exists THEN
        -- Loop through active clients missing coordinates.
        -- We limit to 50 rows to prevent the migration from timing out or hitting
        -- strict rate limits during deployment. For complete coverage of thousands
        -- of rows, a background script or scheduled edge function should be used.
        FOR r IN 
            SELECT "CODIGO", "ENDEREÇO", "BAIRRO", "MUNICÍPIO" 
            FROM "CLIENTES" 
            WHERE "TIPO DE CLIENTE" = 'ATIVO' 
              AND (latitude IS NULL OR longitude IS NULL)
              AND "ENDEREÇO" IS NOT NULL
              AND "MUNICÍPIO" IS NOT NULL
            LIMIT 50 
        LOOP
            -- Rough URL encoding for spaces and commas to form a valid API request
            encoded_addr := replace(r."ENDEREÇO" || ', ' || COALESCE(r."BAIRRO", '') || ', ' || r."MUNICÍPIO", ' ', '+');
            encoded_addr := replace(encoded_addr, ',', '%2C');
            
            url := 'https://nominatim.openstreetmap.org/search?format=json&q=' || encoded_addr;
            
            BEGIN
                -- Respect OpenStreetMap Nominatim Usage Policy (1 request/second minimum)
                PERFORM pg_sleep(1);
                
                -- Dynamic execution to avoid compile-time dependencies if http is somehow broken
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
                -- Ignore errors for individual rows (e.g. timeout, network issues)
                RAISE NOTICE 'Error geocoding for client %: %', r."CODIGO", SQLERRM;
            END;
        END LOOP;
    END IF;
END $$;
