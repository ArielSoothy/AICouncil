-- Arena Mode - Database Schema Migration
-- Created: October 24, 2025
-- Purpose: Autonomous AI trading competition with performance leaderboard

-- ============================================================================
-- 1. ARENA_TRADES TABLE - Autonomous Trade Execution Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arena_trades (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Model identification
  model_id TEXT NOT NULL,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,

  -- Trade details
  symbol TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD')),
  quantity INTEGER,
  entry_price NUMERIC(10, 2),
  stop_loss NUMERIC(10, 2),
  take_profit NUMERIC(10, 2),

  -- AI decision context
  reasoning JSONB NOT NULL,
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  timeframe TEXT NOT NULL,

  -- Execution details
  alpaca_order_id TEXT,
  order_status TEXT,
  filled_price NUMERIC(10, 2),
  filled_at TIMESTAMP WITH TIME ZONE,

  -- Performance tracking
  exit_price NUMERIC(10, 2),
  exit_reason TEXT,
  exit_at TIMESTAMP WITH TIME ZONE,
  pnl NUMERIC(10, 2),
  pnl_percent NUMERIC(5, 2),

  -- Metadata
  scheduled_run_id UUID,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for arena_trades
CREATE INDEX IF NOT EXISTS idx_arena_trades_model ON arena_trades(model_id);
CREATE INDEX IF NOT EXISTS idx_arena_trades_symbol ON arena_trades(symbol);
CREATE INDEX IF NOT EXISTS idx_arena_trades_created ON arena_trades(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_arena_trades_pnl ON arena_trades(pnl DESC NULLS LAST);

-- ============================================================================
-- 2. MODEL_PERFORMANCE TABLE - Aggregate Performance Metrics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.model_performance (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Model identification
  model_id TEXT NOT NULL UNIQUE,
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,

  -- Trading statistics
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  hold_decisions INTEGER DEFAULT 0,

  -- Performance metrics
  total_pnl NUMERIC(10, 2) DEFAULT 0,
  win_rate NUMERIC(5, 2),
  avg_win NUMERIC(10, 2),
  avg_loss NUMERIC(10, 2),
  profit_factor NUMERIC(5, 2),
  sharpe_ratio NUMERIC(5, 2),
  max_drawdown NUMERIC(5, 2),

  -- Strategy metrics
  avg_confidence NUMERIC(3, 2),
  best_timeframe TEXT,
  best_sector TEXT,

  -- Ranking
  rank INTEGER,
  rank_change INTEGER,

  -- Metadata
  last_trade_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Unique constraint and indexes for model_performance
CREATE UNIQUE INDEX IF NOT EXISTS idx_model_performance_model ON model_performance(model_id);
CREATE INDEX IF NOT EXISTS idx_model_performance_rank ON model_performance(rank ASC);
CREATE INDEX IF NOT EXISTS idx_model_performance_pnl ON model_performance(total_pnl DESC);

-- ============================================================================
-- 3. ARENA_CONFIG TABLE - Arena Mode Configuration (Singleton)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arena_config (
  -- Singleton pattern
  id INTEGER DEFAULT 1 PRIMARY KEY CHECK (id = 1),

  -- Scheduling
  is_enabled BOOLEAN DEFAULT FALSE,
  schedule_frequency TEXT DEFAULT 'daily' CHECK (schedule_frequency IN ('hourly', 'daily', 'weekly')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,

  -- Model selection
  enabled_models JSONB DEFAULT '[]',

  -- Safety rails
  max_position_size NUMERIC(10, 2) DEFAULT 10000,
  max_daily_loss NUMERIC(10, 2) DEFAULT 5000,
  max_open_positions INTEGER DEFAULT 5,

  -- Trading parameters
  default_timeframe TEXT DEFAULT 'swing',
  allowed_symbols JSONB DEFAULT '["AAPL", "NVDA", "TSLA", "MSFT", "GOOGL"]',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize default config
INSERT INTO arena_config (id, is_enabled, enabled_models)
VALUES (1, FALSE, '["llama-3.3-70b-versatile", "gemini-2.5-flash", "gemini-2.0-flash"]')
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. ARENA_RUNS TABLE - Scheduled Run Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.arena_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Run details
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'stopped')),

  -- Execution context
  models_executed TEXT[],
  trades_generated INTEGER DEFAULT 0,
  errors JSONB,

  -- Performance summary
  total_pnl NUMERIC(10, 2),
  top_performer TEXT
);

CREATE INDEX IF NOT EXISTS idx_arena_runs_started ON arena_runs(started_at DESC);

-- ============================================================================
-- 5. ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE arena_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_runs ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running migration)
DROP POLICY IF EXISTS "Anyone can view arena trades" ON arena_trades;
DROP POLICY IF EXISTS "Anyone can view model performance" ON model_performance;
DROP POLICY IF EXISTS "Anyone can view arena runs" ON arena_runs;
DROP POLICY IF EXISTS "Service role can insert arena trades" ON arena_trades;
DROP POLICY IF EXISTS "Service role can update arena trades" ON arena_trades;
DROP POLICY IF EXISTS "Service role can manage performance" ON model_performance;
DROP POLICY IF EXISTS "Service role can manage config" ON arena_config;
DROP POLICY IF EXISTS "Service role can manage runs" ON arena_runs;

-- Public read access for leaderboard (anyone can view)
CREATE POLICY "Anyone can view arena trades"
  ON arena_trades FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view model performance"
  ON model_performance FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view arena runs"
  ON arena_runs FOR SELECT
  USING (true);

-- System can insert/update (using service role key in backend)
-- Note: These policies will allow service role key to bypass RLS
-- For production, replace 'true' with proper authentication checks

CREATE POLICY "Service role can insert arena trades"
  ON arena_trades FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service role can update arena trades"
  ON arena_trades FOR UPDATE
  USING (true);

CREATE POLICY "Service role can manage performance"
  ON model_performance FOR ALL
  USING (true);

CREATE POLICY "Service role can manage config"
  ON arena_config FOR ALL
  USING (true);

CREATE POLICY "Service role can manage runs"
  ON arena_runs FOR ALL
  USING (true);

-- ============================================================================
-- 6. HELPER FUNCTIONS
-- ============================================================================

-- Function to update model performance after trade closes
CREATE OR REPLACE FUNCTION update_model_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if trade has closed (has P&L)
  IF NEW.pnl IS NOT NULL THEN
    INSERT INTO model_performance (
      model_id, model_name, provider,
      total_trades, winning_trades, losing_trades, total_pnl, win_rate, last_trade_at
    )
    VALUES (
      NEW.model_id, NEW.model_name, NEW.provider,
      1,  -- First trade
      CASE WHEN NEW.pnl > 0 THEN 1 ELSE 0 END,  -- winning_trades
      CASE WHEN NEW.pnl < 0 THEN 1 ELSE 0 END,  -- losing_trades
      NEW.pnl,  -- Include P&L from first trade
      CASE WHEN NEW.pnl > 0 THEN 100.0 ELSE 0.0 END,  -- win_rate (100% if first trade wins)
      NEW.exit_at  -- last_trade_at
    )
    ON CONFLICT (model_id) DO UPDATE SET
      total_trades = model_performance.total_trades + 1,
      winning_trades = model_performance.winning_trades + CASE WHEN NEW.pnl > 0 THEN 1 ELSE 0 END,
      losing_trades = model_performance.losing_trades + CASE WHEN NEW.pnl < 0 THEN 1 ELSE 0 END,
      total_pnl = model_performance.total_pnl + NEW.pnl,
      win_rate = CASE
        WHEN model_performance.total_trades + 1 > 0 THEN
          ((model_performance.winning_trades + CASE WHEN NEW.pnl > 0 THEN 1 ELSE 0 END)::NUMERIC /
           (model_performance.total_trades + 1)::NUMERIC) * 100
        ELSE 0
      END,
      last_trade_at = NEW.exit_at,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update performance when trade closes
DROP TRIGGER IF EXISTS arena_trade_closed_trigger ON arena_trades;
CREATE TRIGGER arena_trade_closed_trigger
  AFTER INSERT OR UPDATE OF pnl ON arena_trades
  FOR EACH ROW
  WHEN (NEW.pnl IS NOT NULL)
  EXECUTE FUNCTION update_model_performance();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Verify tables created
DO $$
BEGIN
  RAISE NOTICE 'Arena Mode tables created successfully:';
  RAISE NOTICE '  - arena_trades';
  RAISE NOTICE '  - model_performance';
  RAISE NOTICE '  - arena_config';
  RAISE NOTICE '  - arena_runs';
  RAISE NOTICE 'RLS policies enabled for public read access';
  RAISE NOTICE 'Auto-update trigger created for model_performance';
END $$;
