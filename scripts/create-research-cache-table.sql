-- Research Cache Table for AI Council Trading System
-- Stores market research results to avoid redundant API calls
-- Run this in Supabase SQL Editor

-- Create research_cache table
CREATE TABLE IF NOT EXISTS public.research_cache (
  -- Primary Key
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Cache Key (symbol + timeframe)
  symbol TEXT NOT NULL,
  timeframe TEXT NOT NULL CHECK (timeframe IN ('day', 'swing', 'position', 'longterm')),

  -- Research Data (Full ResearchReport object as JSONB)
  research_data JSONB NOT NULL,

  -- Research Metadata
  total_tool_calls INTEGER NOT NULL,
  research_duration_ms INTEGER NOT NULL,
  data_sources TEXT[] NOT NULL, -- ['yahoo_finance', 'alpaca']

  -- Cache Management
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  access_count INTEGER DEFAULT 0,

  -- Incremental Update Tracking (for future Phase 3)
  quote_updated_at TIMESTAMP WITH TIME ZONE,
  news_updated_at TIMESTAMP WITH TIME ZONE,
  indicators_updated_at TIMESTAMP WITH TIME ZONE,

  -- Status
  is_stale BOOLEAN DEFAULT FALSE,
  invalidated_reason TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_research_cache_symbol_timeframe
  ON public.research_cache(symbol, timeframe);

CREATE INDEX IF NOT EXISTS idx_research_cache_expires_at
  ON public.research_cache(expires_at);

CREATE INDEX IF NOT EXISTS idx_research_cache_cached_at
  ON public.research_cache(cached_at DESC);

-- Create unique constraint (one cache per symbol+timeframe)
CREATE UNIQUE INDEX IF NOT EXISTS idx_research_cache_key
  ON public.research_cache(symbol, timeframe);

-- Create GIN index for JSONB searches (optional but helpful)
CREATE INDEX IF NOT EXISTS idx_research_cache_data
  ON public.research_cache USING GIN (research_data);

-- Enable Row Level Security
ALTER TABLE public.research_cache ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (idempotent)
DROP POLICY IF EXISTS "Research cache is publicly readable" ON public.research_cache;
DROP POLICY IF EXISTS "Authenticated users can write cache" ON public.research_cache;
DROP POLICY IF EXISTS "Authenticated users can update cache" ON public.research_cache;

-- RLS Policy: Research cache is publicly readable (shared across all users)
-- Rationale: Market research is not user-specific, can be shared
CREATE POLICY "Research cache is publicly readable"
  ON public.research_cache
  FOR SELECT
  USING (true);

-- RLS Policy: Only authenticated users can write (prevents abuse)
CREATE POLICY "Authenticated users can write cache"
  ON public.research_cache
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- RLS Policy: Only authenticated users can update cache
CREATE POLICY "Authenticated users can update cache"
  ON public.research_cache
  FOR UPDATE
  USING (auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- Create function to auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_research_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for auto-updating updated_at
CREATE TRIGGER trigger_update_research_cache_updated_at
  BEFORE UPDATE ON public.research_cache
  FOR EACH ROW
  EXECUTE FUNCTION update_research_cache_updated_at();

-- Create function to clean up expired cache entries
CREATE OR REPLACE FUNCTION cleanup_expired_research_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.research_cache
  WHERE expires_at < NOW();

  RAISE NOTICE 'Cleaned up expired research cache entries';
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a scheduled job to run cleanup daily (requires pg_cron extension)
-- This is commented out - you can enable it if you have pg_cron installed
-- SELECT cron.schedule(
--   'cleanup-research-cache',
--   '0 2 * * *', -- Run at 2 AM daily
--   'SELECT cleanup_expired_research_cache();'
-- );

-- Grant permissions
GRANT ALL ON public.research_cache TO authenticated;
GRANT ALL ON public.research_cache TO service_role;

-- Verify table creation
SELECT
  'research_cache table created successfully!' as status,
  count(*) as row_count
FROM public.research_cache;

-- Display cache statistics function (useful for monitoring)
CREATE OR REPLACE FUNCTION get_research_cache_stats()
RETURNS TABLE(
  total_entries BIGINT,
  active_entries BIGINT,
  expired_entries BIGINT,
  most_cached_symbols TEXT[],
  avg_access_count NUMERIC,
  cache_age_hours NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_entries,
    COUNT(*) FILTER (WHERE expires_at > NOW())::BIGINT as active_entries,
    COUNT(*) FILTER (WHERE expires_at <= NOW())::BIGINT as expired_entries,
    ARRAY_AGG(DISTINCT symbol ORDER BY symbol) FILTER (WHERE expires_at > NOW()) as most_cached_symbols,
    AVG(access_count)::NUMERIC as avg_access_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - cached_at)) / 3600)::NUMERIC as cache_age_hours
  FROM public.research_cache;
END;
$$ LANGUAGE plpgsql;

-- Test the stats function
SELECT * FROM get_research_cache_stats();
