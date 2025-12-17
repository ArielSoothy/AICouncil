-- Enable Row Level Security (RLS) for paper_trades table
-- Run this in Supabase Dashboard SQL Editor
-- Project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

-- ============================================================================
-- Step 1: Add user_id column to track ownership
-- ============================================================================

-- Add user_id column (nullable to support existing records)
ALTER TABLE public.paper_trades
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_paper_trades_user_id ON public.paper_trades(user_id);

-- ============================================================================
-- Step 2: Enable Row Level Security
-- ============================================================================

ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Step 3: Drop existing policies (if any)
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own trades" ON public.paper_trades;
DROP POLICY IF EXISTS "Users can insert their own trades" ON public.paper_trades;
DROP POLICY IF EXISTS "Users can update their own trades" ON public.paper_trades;
DROP POLICY IF EXISTS "Users can delete their own trades" ON public.paper_trades;
DROP POLICY IF EXISTS "Service role has full access" ON public.paper_trades;
DROP POLICY IF EXISTS "Allow anonymous read for demo" ON public.paper_trades;

-- ============================================================================
-- Step 4: Create RLS Policies
-- ============================================================================

-- Policy 1: Authenticated users can view their own trades
CREATE POLICY "Users can view their own trades" ON public.paper_trades
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy 2: Authenticated users can insert trades (auto-assign user_id)
CREATE POLICY "Users can insert their own trades" ON public.paper_trades
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy 3: Authenticated users can update their own trades
CREATE POLICY "Users can update their own trades" ON public.paper_trades
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Authenticated users can delete their own trades
CREATE POLICY "Users can delete their own trades" ON public.paper_trades
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy 5: Service role (backend API) has full access
-- This allows your API routes to read/write on behalf of users
CREATE POLICY "Service role has full access" ON public.paper_trades
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Policy 6: Allow anonymous users to view trades with NULL user_id (optional - for demo trades)
-- Comment this out if you don't want public demo trades
CREATE POLICY "Allow anonymous read for demo" ON public.paper_trades
  FOR SELECT
  USING (user_id IS NULL);

-- ============================================================================
-- Step 5: Verification
-- ============================================================================

-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'paper_trades';

-- List all policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'paper_trades'
ORDER BY policyname;

-- ============================================================================
-- Step 6: Update existing records (optional)
-- ============================================================================

-- If you have existing trades without user_id, you can either:
-- A) Delete them (if test data):
-- DELETE FROM public.paper_trades WHERE user_id IS NULL;

-- B) Or assign them to a specific user:
-- UPDATE public.paper_trades
-- SET user_id = 'YOUR_USER_UUID'
-- WHERE user_id IS NULL;

-- ============================================================================
-- Notes
-- ============================================================================

-- 1. Service Role Access:
--    Your backend API uses SUPABASE_SERVICE_ROLE_KEY which bypasses RLS.
--    This is secure because only your server has this key.

-- 2. Client Access:
--    Frontend clients use SUPABASE_ANON_KEY which enforces RLS.
--    Users can only access their own trades.

-- 3. Testing:
--    After running this script, test with:
--    - Authenticated user: SELECT * FROM paper_trades; (should see only their trades)
--    - Service role: Has full access (for backend operations)

-- 4. Environment Variables Required:
--    NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
--    SUPABASE_SERVICE_ROLE_KEY=your-service-role-key (server-side only!)
