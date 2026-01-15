-- Migration to cleanup database triggers and functions related to the deleted QUANTIDADE DE ESTOQUE FINAL table
-- This prevents errors during INSERTs into BANCO_DE_DADOS

-- 1. Drop Triggers on BANCO_DE_DADOS that might reference the deleted table
-- We explicitly drop known triggers to be safe
DROP TRIGGER IF EXISTS sync_stock_value ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS update_stock_value ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS sync_quantidade_estoque_final ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS tr_sync_estoque_final ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS trigger_sync_stock_values ON "BANCO_DE_DADOS";
DROP TRIGGER IF EXISTS trg_auto_sync_stock_values ON "BANCO_DE_DADOS";

-- 2. Drop Functions that were likely used by these triggers
-- We use CASCADE to ensuring any other dependent objects (like triggers we might have missed) are also removed
DROP FUNCTION IF EXISTS calculate_stock_value() CASCADE;
DROP FUNCTION IF EXISTS sync_stock_value() CASCADE;
DROP FUNCTION IF EXISTS update_stock_values() CASCADE;
DROP FUNCTION IF EXISTS sync_stock_values_trigger() CASCADE;

-- 3. Ensure the table is definitively gone (Safety check)
DROP TABLE IF EXISTS "QUANTIDADE DE ESTOQUE FINAL";
