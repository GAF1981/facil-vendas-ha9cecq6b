CREATE OR REPLACE FUNCTION public.update_x_na_rota()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Handle INSERT
  IF TG_OP = 'INSERT' THEN
    -- If a seller is assigned during insertion, increment x_na_rota
    -- This handles the logic where a client is added to a route with a seller
    -- or carried over to a new route with a seller.
    IF NEW.vendedor_id IS NOT NULL THEN
       NEW.x_na_rota := COALESCE(NEW.x_na_rota, 0) + 1;
    END IF;
    RETURN NEW;
  
  -- Handle UPDATE
  ELSIF TG_OP = 'UPDATE' THEN
    -- Case 1: Seller Assigned (NULL -> Value)
    IF OLD.vendedor_id IS NULL AND NEW.vendedor_id IS NOT NULL THEN
      NEW.x_na_rota := COALESCE(NEW.x_na_rota, 0) + 1;
    
    -- Case 2: Seller Removed (Value -> NULL)
    ELSIF OLD.vendedor_id IS NOT NULL AND NEW.vendedor_id IS NULL THEN
      NEW.x_na_rota := GREATEST(0, COALESCE(NEW.x_na_rota, 0) - 1);
    END IF;
    
    RETURN NEW;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_x_na_rota ON "ROTA_ITEMS";

CREATE TRIGGER trg_update_x_na_rota
BEFORE INSERT OR UPDATE ON "ROTA_ITEMS"
FOR EACH ROW
EXECUTE FUNCTION public.update_x_na_rota();
