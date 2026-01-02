-- Migration to make currency parsing ultra-resilient against malformed data
-- This ensures the inventory page doesn't crash even with bad data in monetary columns

CREATE OR REPLACE FUNCTION parse_currency_sql(p_value TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  -- Handle NULL immediately
  IF p_value IS NULL THEN
    RETURN 0;
  END IF;

  -- Remove leading/trailing whitespace
  v_clean := TRIM(p_value);
  
  -- Handle empty string
  IF v_clean = '' THEN
    RETURN 0;
  END IF;

  -- 1. Remove everything that is NOT a digit, comma, dot, or minus sign.
  -- This aggressively strips currency symbols (R$, $), letters, hidden chars, etc.
  v_clean := REGEXP_REPLACE(v_clean, '[^0-9,.-]', '', 'g');

  -- If nothing useful left (e.g. only symbols were present), return 0
  IF v_clean = '' OR v_clean = '-' OR v_clean = '.' OR v_clean = ',' THEN
    RETURN 0;
  END IF;

  -- 2. Handle Brazilian Format (1.234,56)
  -- Logic: If both dot and comma exist, assume dot is thousands and comma is decimal.
  -- If only comma exists, assume decimal.
  -- If only dot exists, we assume thousands separator if it looks like one, or decimal if not.
  -- However, for this system context (PT-BR), we enforce: Dot = Thousands, Comma = Decimal.
  
  -- Remove dots (thousands separators)
  v_clean := REPLACE(v_clean, '.', '');
  -- Replace comma with dot (standard decimal separator)
  v_clean := REPLACE(v_clean, ',', '.');

  -- 3. Final safety check: ensure strictly numeric format.
  -- E.g., '1.2.3' would still be invalid for casting.
  -- We rely on Postgres Safe Casting logic via Exception Block.
  
  BEGIN
    RETURN v_clean::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    -- On ANY error (overflow, invalid syntax), fallback to 0 instead of crashing the query
    RETURN 0;
  END;
END;
$$;
