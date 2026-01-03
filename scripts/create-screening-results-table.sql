-- Pre-Market Screening Results Table
-- Stores historical screening data from orchestrator
-- Schema designed for fast reads by FastAPI

CREATE TABLE IF NOT EXISTS public.screening_results (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  execution_time_seconds NUMERIC(5,1) NOT NULL,
  total_scanned INTEGER NOT NULL,
  total_returned INTEGER NOT NULL,

  -- Screening Parameters
  min_gap_percent NUMERIC(5,2) NOT NULL,
  min_volume INTEGER NOT NULL,
  max_results INTEGER NOT NULL,
  scan_code TEXT NOT NULL DEFAULT 'TOP_PERC_GAIN',
  include_sentiment BOOLEAN NOT NULL DEFAULT FALSE,

  -- Results (JSONB for flexibility)
  stocks JSONB NOT NULL,

  -- Indexes for fast queries
  CONSTRAINT valid_stocks CHECK (jsonb_typeof(stocks) = 'array')
);

-- Index on timestamp for "latest results" queries
CREATE INDEX IF NOT EXISTS idx_screening_results_created_at
  ON public.screening_results(created_at DESC);

-- Index on scan parameters for filtered queries
CREATE INDEX IF NOT EXISTS idx_screening_results_scan_params
  ON public.screening_results(min_gap_percent, min_volume);

-- GIN index on JSONB stocks for symbol searches
CREATE INDEX IF NOT EXISTS idx_screening_results_stocks_gin
  ON public.screening_results USING GIN (stocks);

-- Row Level Security (RLS) - Allow public read access
ALTER TABLE public.screening_results ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read screening results
CREATE POLICY "Public read access" ON public.screening_results
  FOR SELECT USING (true);

-- Policy: Allow inserts from service role or anon (for orchestrator and testing)
CREATE POLICY "Allow insert access" ON public.screening_results
  FOR INSERT WITH CHECK (true);

-- Comments for documentation
COMMENT ON TABLE public.screening_results IS 'Pre-market stock screening results from TWS API orchestrator';
COMMENT ON COLUMN public.screening_results.stocks IS 'Array of stock objects with symbol, score, fundamentals, short_data, ratios, bars, sentiment';
COMMENT ON COLUMN public.screening_results.execution_time_seconds IS 'How long the screening took (target: <30s for 20 stocks)';
COMMENT ON COLUMN public.screening_results.scan_code IS 'TWS scanner code used (TOP_PERC_GAIN, TOP_PERC_LOSE, etc)';

-- Example query for FastAPI endpoint
COMMENT ON INDEX idx_screening_results_created_at IS 'Optimized for: SELECT * FROM screening_results ORDER BY created_at DESC LIMIT 1';
