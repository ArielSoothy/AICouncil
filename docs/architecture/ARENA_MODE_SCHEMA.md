# Arena Mode - Database Schema Design

**Created**: October 24, 2025
**Purpose**: Autonomous AI trading competition with performance leaderboard

---

## Overview

Arena Mode enables AI models to compete autonomously by executing paper trades on a schedule (daily/hourly). The system tracks performance metrics and displays a real-time leaderboard showing which models perform best.

---

## Database Tables

### 1. `arena_trades` - Autonomous Trade Execution Log

Records every trade executed autonomously by Arena Mode.

```sql
CREATE TABLE public.arena_trades (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Model identification
  model_id TEXT NOT NULL,  -- e.g., 'claude-3-5-sonnet-20241022'
  model_name TEXT NOT NULL,  -- e.g., 'Claude 3.5 Sonnet'
  provider TEXT NOT NULL,  -- e.g., 'anthropic', 'openai', 'google'

  -- Trade details
  symbol TEXT NOT NULL,  -- e.g., 'AAPL', 'NVDA'
  action TEXT NOT NULL CHECK (action IN ('BUY', 'SELL', 'HOLD')),
  quantity INTEGER,  -- Number of shares (NULL for HOLD)
  entry_price NUMERIC(10, 2),  -- Entry price per share
  stop_loss NUMERIC(10, 2),  -- Stop-loss price
  take_profit NUMERIC(10, 2),  -- Take-profit target

  -- AI decision context
  reasoning JSONB NOT NULL,  -- Full AI reasoning (bullish/bearish/technical/fundamental)
  confidence NUMERIC(3, 2) CHECK (confidence >= 0 AND confidence <= 1),  -- 0.0 to 1.0
  timeframe TEXT NOT NULL,  -- 'day', 'swing', 'position', 'long-term'

  -- Execution details
  alpaca_order_id TEXT,  -- Alpaca API order ID
  order_status TEXT,  -- 'accepted', 'filled', 'rejected', 'cancelled'
  filled_price NUMERIC(10, 2),  -- Actual fill price
  filled_at TIMESTAMP WITH TIME ZONE,  -- When order filled

  -- Performance tracking
  exit_price NUMERIC(10, 2),  -- Exit price (when closed)
  exit_reason TEXT,  -- 'stop_loss', 'take_profit', 'manual', 'time_limit'
  exit_at TIMESTAMP WITH TIME ZONE,  -- When position closed
  pnl NUMERIC(10, 2),  -- Profit/Loss in dollars
  pnl_percent NUMERIC(5, 2),  -- P&L percentage

  -- Metadata
  scheduled_run_id UUID,  -- Reference to scheduled job that triggered this
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Indexes
  CONSTRAINT arena_trades_pkey PRIMARY KEY (id)
);

-- Indexes for performance
CREATE INDEX idx_arena_trades_model ON arena_trades(model_id);
CREATE INDEX idx_arena_trades_symbol ON arena_trades(symbol);
CREATE INDEX idx_arena_trades_created ON arena_trades(created_at DESC);
CREATE INDEX idx_arena_trades_pnl ON arena_trades(pnl DESC NULLS LAST);
```

---

### 2. `model_performance` - Aggregate Performance Metrics

Aggregated performance statistics per model, updated after each trade closes.

```sql
CREATE TABLE public.model_performance (
  -- Primary key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Model identification
  model_id TEXT NOT NULL UNIQUE,  -- e.g., 'claude-3-5-sonnet-20241022'
  model_name TEXT NOT NULL,
  provider TEXT NOT NULL,

  -- Trading statistics
  total_trades INTEGER DEFAULT 0,
  winning_trades INTEGER DEFAULT 0,
  losing_trades INTEGER DEFAULT 0,
  hold_decisions INTEGER DEFAULT 0,

  -- Performance metrics
  total_pnl NUMERIC(10, 2) DEFAULT 0,  -- Total profit/loss
  win_rate NUMERIC(5, 2),  -- Percentage of winning trades
  avg_win NUMERIC(10, 2),  -- Average profit on winning trades
  avg_loss NUMERIC(10, 2),  -- Average loss on losing trades
  profit_factor NUMERIC(5, 2),  -- Total wins / Total losses
  sharpe_ratio NUMERIC(5, 2),  -- Risk-adjusted returns
  max_drawdown NUMERIC(5, 2),  -- Largest peak-to-trough decline

  -- Strategy metrics
  avg_confidence NUMERIC(3, 2),  -- Average confidence level
  best_timeframe TEXT,  -- Best performing timeframe
  best_sector TEXT,  -- Best performing sector/symbol

  -- Ranking
  rank INTEGER,  -- Current leaderboard position
  rank_change INTEGER,  -- Change since last update (+3, -1, etc.)

  -- Metadata
  last_trade_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT model_performance_pkey PRIMARY KEY (id)
);

-- Unique constraint on model_id
CREATE UNIQUE INDEX idx_model_performance_model ON model_performance(model_id);

-- Index for leaderboard queries
CREATE INDEX idx_model_performance_rank ON model_performance(rank ASC);
CREATE INDEX idx_model_performance_pnl ON model_performance(total_pnl DESC);
```

---

### 3. `arena_config` - Arena Mode Configuration

System configuration for autonomous trading.

```sql
CREATE TABLE public.arena_config (
  -- Singleton pattern (only 1 row)
  id INTEGER DEFAULT 1 PRIMARY KEY CHECK (id = 1),

  -- Scheduling
  is_enabled BOOLEAN DEFAULT FALSE,  -- Master enable/disable switch
  schedule_frequency TEXT DEFAULT 'daily' CHECK (schedule_frequency IN ('hourly', 'daily', 'weekly')),
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,

  -- Model selection
  enabled_models JSONB DEFAULT '[]',  -- Array of model IDs to compete
  -- Example: ["claude-3-5-sonnet-20241022", "gpt-4o", "gemini-2.5-pro"]

  -- Safety rails
  max_position_size NUMERIC(10, 2) DEFAULT 10000,  -- Max $ per trade
  max_daily_loss NUMERIC(10, 2) DEFAULT 5000,  -- Max daily loss before stopping
  max_open_positions INTEGER DEFAULT 5,  -- Max concurrent positions per model

  -- Trading parameters
  default_timeframe TEXT DEFAULT 'swing',
  allowed_symbols JSONB DEFAULT '["AAPL", "NVDA", "TSLA", "MSFT", "GOOGL"]',

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Initialize with default config
INSERT INTO arena_config (id, is_enabled, enabled_models)
VALUES (1, FALSE, '["llama-3.3-70b-versatile", "gemini-2.5-flash", "gemini-2.0-flash"]')
ON CONFLICT (id) DO NOTHING;
```

---

### 4. `arena_runs` - Scheduled Run Log

Tracks each autonomous trading run.

```sql
CREATE TABLE public.arena_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Run details
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'stopped')),

  -- Execution context
  models_executed TEXT[],  -- Array of model IDs that ran
  trades_generated INTEGER DEFAULT 0,
  errors JSONB,  -- Any errors encountered

  -- Performance summary
  total_pnl NUMERIC(10, 2),  -- Total P&L from this run
  top_performer TEXT,  -- Best model in this run

  CONSTRAINT arena_runs_pkey PRIMARY KEY (id)
);

CREATE INDEX idx_arena_runs_started ON arena_runs(started_at DESC);
```

---

## Row Level Security (RLS)

```sql
-- Enable RLS
ALTER TABLE arena_trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE arena_runs ENABLE ROW LEVEL SECURITY;

-- Public read access for leaderboard (anonymous users can view)
CREATE POLICY "Anyone can view arena trades" ON arena_trades
  FOR SELECT USING (true);

CREATE POLICY "Anyone can view model performance" ON model_performance
  FOR SELECT USING (true);

-- Only authenticated admins can modify config
CREATE POLICY "Only admins can update arena config" ON arena_config
  FOR ALL USING (
    auth.jwt() ->> 'email' = 'ariel@example.com'  -- Replace with actual admin email
  );

-- System can insert trades (service role key)
CREATE POLICY "Service role can insert arena trades" ON arena_trades
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Service role can update performance" ON model_performance
  FOR ALL WITH CHECK (true);

CREATE POLICY "Service role can manage runs" ON arena_runs
  FOR ALL WITH CHECK (true);
```

---

## Supabase Migration Commands

```bash
# Create tables via Supabase SQL Editor or migration file

# 1. Run arena_trades table creation
# 2. Run model_performance table creation
# 3. Run arena_config table creation
# 4. Run arena_runs table creation
# 5. Run RLS policies
```

---

## Next Steps

1. **Create Supabase migration** - Add all tables to Supabase project
2. **Build API routes** - `/api/arena/execute`, `/api/arena/leaderboard`, `/api/arena/config`
3. **Scheduler implementation** - Vercel Cron or Supabase Edge Function
4. **Arena UI** - Leaderboard page at `/arena` route
5. **Safety rails** - Position limits, loss limits, emergency stop

---

**Status**: Schema design complete, ready for implementation
