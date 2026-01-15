-- Migration to cleanup database triggers and functions related to the deleted QUANTIDADE DE ESTOQUE FINAL table
-- This prevents errors during INSERTs into BANCO_DE_DADOS

-- 1. Drop Triggers on BANCO_DE_DADOS that might reference the deleted table
-- We use dynamic SQL or just standard DROP TRIGGER IF EXISTS for known/suspected names
DROP TRIGGER IF EXISTS sync_stock_value ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS update_stock_value ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS sync_quantidade_estoque_final ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS tr_sync_estoque_final ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS trigger_sync_stock_values ON "BANCO_DE_DADOS";

-- 2. Drop Functions that were likely used by these triggers
DROP FUNCTION IF EXISTS calculate_stock_value();
DROP FUNCTION IF EXISTS sync_stock_value();
DROP FUNCTION IF EXISTS update_stock_values();
DROP FUNCTION IF EXISTS sync_stock_values_trigger();

-- 3. Ensure the table is definitively gone (Safety check)
DROP TABLE IF EXISTS "QUANTIDADE DE ESTOQUE FINAL";
