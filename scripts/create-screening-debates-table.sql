-- ═══════════════════════════════════════════════════════════════
-- Screening Debates Table
-- Stores results from the screening-to-debate pipeline
-- Each row = one daily briefing session (multiple stock debates)
-- ═══════════════════════════════════════════════════════════════

-- Create the screening_debates table
CREATE TABLE IF NOT EXISTS public.screening_debates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Link to screening scan (nullable - can run without a scan)
  scan_id UUID REFERENCES public.screening_scans(id) ON DELETE SET NULL,

  -- Configuration used for this debate session
  config JSONB NOT NULL DEFAULT '{}'::jsonb,

  -- Stocks that were selected for debate (symbol array)
  stocks_selected TEXT[] NOT NULL DEFAULT '{}',

  -- Full debate results (per-stock: screening data, debate transcript, judge verdict, trade execution)
  results JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Summary stats (buys/watches/skips/trades/tokens/cost)
  summary JSONB DEFAULT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'error')),
  error_message TEXT DEFAULT NULL,

  -- Timing
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick lookup of latest debates
CREATE INDEX IF NOT EXISTS idx_screening_debates_started_at
  ON public.screening_debates (started_at DESC);

-- Index for looking up debates by scan
CREATE INDEX IF NOT EXISTS idx_screening_debates_scan_id
  ON public.screening_debates (scan_id)
  WHERE scan_id IS NOT NULL;

-- Index for status filtering
CREATE INDEX IF NOT EXISTS idx_screening_debates_status
  ON public.screening_debates (status);

-- Enable RLS (backend uses service_role_key which bypasses RLS)
ALTER TABLE public.screening_debates ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role full access (default behavior)
-- No user-facing policies needed since this is server-side only

COMMENT ON TABLE public.screening_debates IS
  'Stores screening-to-debate pipeline results. Each row = one briefing session with multiple stock debates.';
COMMENT ON COLUMN public.screening_debates.config IS
  'ScreeningDebateConfig: topN, models, tier, autoTrade settings';
COMMENT ON COLUMN public.screening_debates.results IS
  'Array of StockDebateResult: per-stock screening data, debate transcript, judge verdict, trade execution';
COMMENT ON COLUMN public.screening_debates.summary IS
  'Aggregate stats: buys/watches/skips count, trades executed, total tokens, total cost';
