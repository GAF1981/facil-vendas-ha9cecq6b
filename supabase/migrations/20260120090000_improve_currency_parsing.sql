CREATE OR REPLACE FUNCTION parse_currency_sql(p_value TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_clean TEXT;
BEGIN
  -- Handle NULL or empty string
  IF p_value IS NULL OR TRIM(p_value) = '' THEN
    RETURN 0;
  END IF;

  -- 1. Remove currency symbol (R$), whitespace, and any non-numeric/punctuation characters
  -- We keep digits, comma, dot, and minus sign
  v_clean := REGEXP_REPLACE(p_value, '[^0-9,.-]', '', 'g');

  -- 2. Handle Brazilian Format (1.234,56)
  -- Remove dots (thousands separators)
  v_clean := REPLACE(v_clean, '.', '');
  -- Replace comma with dot (decimal separator)
  v_clean := REPLACE(v_clean, ',', '.');

  -- 3. Safety check: ensure only valid numeric characters remain
  -- (Should be redundant after above steps but good for sanity)
  v_clean := REGEXP_REPLACE(v_clean, '[^0-9.-]', '', 'g');

  IF v_clean = '' OR v_clean = '-' THEN
    RETURN 0;
  END IF;

  BEGIN
    RETURN v_clean::NUMERIC;
  EXCEPTION WHEN OTHERS THEN
    RETURN 0;
  END;
END;
$$;
