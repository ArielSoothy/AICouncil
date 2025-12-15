-- Arena Mode Enhancement - Stock Locks & Rotation
-- Created: December 15, 2025
-- Purpose: Exclusive stock ownership and daily rotation for fair competition

-- ============================================================================
-- 1. ARENA_STOCK_LOCKS TABLE - Track exclusive stock ownership per model
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arena_stock_locks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Model ownership
  model_id TEXT NOT NULL,
  symbol TEXT NOT NULL,

  -- Lock lifecycle
  locked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  unlocked_at TIMESTAMP WITH TIME ZONE,

  -- Reference to trade
  arena_trade_id UUID REFERENCES arena_trades(id) ON DELETE SET NULL,

  -- Constraints
  CONSTRAINT unique_active_lock UNIQUE (symbol) -- Only one model can own a symbol at a time
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_stock_locks_model ON arena_stock_locks(model_id);
CREATE INDEX IF NOT EXISTS idx_stock_locks_symbol ON arena_stock_locks(symbol);
CREATE INDEX IF NOT EXISTS idx_stock_locks_active ON arena_stock_locks(symbol) WHERE unlocked_at IS NULL;

-- ============================================================================
-- 2. ARENA_ROTATION TABLE - Track daily rotation order for fairness
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arena_rotation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Date tracking (one rotation per day)
  date DATE NOT NULL UNIQUE,

  -- Model order for this day (rotates daily)
  model_order JSONB NOT NULL,  -- ["model-id-1", "model-id-2", ...]

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quick date lookup
CREATE INDEX IF NOT EXISTS idx_rotation_date ON arena_rotation(date DESC);

-- ============================================================================
-- 3. ADD BRACKET ORDER FIELDS TO ARENA_TRADES
-- ============================================================================

-- Stop-loss price
ALTER TABLE arena_trades
ADD COLUMN IF NOT EXISTS stop_loss_price NUMERIC(10,2);

-- Take-profit price
ALTER TABLE arena_trades
ADD COLUMN IF NOT EXISTS take_profit_price NUMERIC(10,2);

-- Alpaca child order IDs (bracket orders create multiple orders)
ALTER TABLE arena_trades
ADD COLUMN IF NOT EXISTS stop_loss_order_id TEXT;

ALTER TABLE arena_trades
ADD COLUMN IF NOT EXISTS take_profit_order_id TEXT;

-- Bracket order status tracking
-- pending = waiting for stop/profit to hit
-- stop_hit = stop-loss triggered
-- profit_hit = take-profit triggered
-- expired = market closed without hitting either
-- cancelled = manually cancelled
ALTER TABLE arena_trades
ADD COLUMN IF NOT EXISTS bracket_status TEXT DEFAULT 'pending'
CHECK (bracket_status IN ('pending', 'stop_hit', 'profit_hit', 'expired', 'cancelled'));

-- ============================================================================
-- 4. ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE arena_stock_locks ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_rotation ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view locks and rotation)
DROP POLICY IF EXISTS "Anyone can view stock locks" ON arena_stock_locks;
CREATE POLICY "Anyone can view stock locks"
  ON arena_stock_locks FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Anyone can view rotation" ON arena_rotation;
CREATE POLICY "Anyone can view rotation"
  ON arena_rotation FOR SELECT
  USING (true);

-- Service role can manage
DROP POLICY IF EXISTS "Service role can manage stock locks" ON arena_stock_locks;
CREATE POLICY "Service role can manage stock locks"
  ON arena_stock_locks FOR ALL
  USING (true);

DROP POLICY IF EXISTS "Service role can manage rotation" ON arena_rotation;
CREATE POLICY "Service role can manage rotation"
  ON arena_rotation FOR ALL
  USING (true);

-- ============================================================================
-- 5. HELPER FUNCTIONS
-- ============================================================================

-- Function to get all currently locked stocks (active locks only)
CREATE OR REPLACE FUNCTION get_locked_stocks()
RETURNS TABLE(symbol TEXT, model_id TEXT, locked_at TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
  RETURN QUERY
  SELECT l.symbol, l.model_id, l.locked_at
  FROM arena_stock_locks l
  WHERE l.unlocked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to unlock a stock (called when position closes)
CREATE OR REPLACE FUNCTION unlock_stock(p_symbol TEXT)
RETURNS VOID AS $$
BEGIN
  UPDATE arena_stock_locks
  SET unlocked_at = NOW()
  WHERE symbol = p_symbol AND unlocked_at IS NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Arena Mode Enhancement migration complete:';
  RAISE NOTICE '  - arena_stock_locks table created';
  RAISE NOTICE '  - arena_rotation table created';
  RAISE NOTICE '  - Bracket order fields added to arena_trades';
  RAISE NOTICE '  - RLS policies enabled';
  RAISE NOTICE '  - Helper functions created';
END $$;
