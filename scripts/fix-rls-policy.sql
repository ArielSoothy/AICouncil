-- Fix RLS for paper_trades table
-- Run this in Supabase Dashboard SQL Editor: https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/sql

-- Option 1: Disable RLS (Simplest for development)
ALTER TABLE paper_trades DISABLE ROW LEVEL SECURITY;

-- Option 2: Keep RLS enabled but add policy for service role (More secure)
-- ALTER TABLE paper_trades ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Allow service role full access" ON paper_trades
--   FOR ALL
--   USING (true)
--   WITH CHECK (true);

-- Verify RLS status
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'paper_trades';
