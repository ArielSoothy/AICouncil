-- Decision Memory System - Supabase Schema
-- Run this in your Supabase SQL Editor
-- Created: December 2025

-- ============================================================================
-- DECISIONS TABLE
-- Stores all debate decisions with full context for future analytics
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.decisions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- User Reference (nullable for anonymous users initially)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,

  -- ===== QUERY & CONTEXT =====
  -- Original user query
  query TEXT NOT NULL,

  -- Domain classification for analytics
  -- Values: 'general', 'career', 'trading', 'apartment', 'vacation', etc.
  domain TEXT DEFAULT 'general',

  -- User-defined tags for organization
  tags TEXT[] DEFAULT '{}',

  -- Optional title (auto-generated or user-provided)
  title TEXT,

  -- ===== DEBATE DATA =====
  -- Full DebateSession object as JSONB for flexibility
  -- Contains: agents[], rounds[], finalSynthesis, disagreementScore, etc.
  debate_session JSONB NOT NULL,

  -- Models used in this debate (denormalized for easy querying)
  models_used TEXT[] DEFAULT '{}',

  -- Research mode used
  -- Values: 'centralized', 'distributed', 'hybrid'
  research_mode TEXT DEFAULT 'centralized',

  -- Number of debate rounds
  rounds_count INTEGER DEFAULT 1,

  -- ===== RESULT =====
  -- Final recommendation extracted from synthesis
  final_recommendation TEXT,

  -- Confidence score (0.00 to 1.00)
  confidence_score DECIMAL(3,2),

  -- Key points agreed upon
  key_agreements TEXT[],

  -- Key disagreements between models
  key_disagreements TEXT[],

  -- ===== OUTCOME TRACKING (Future Phase 2) =====
  -- Status of the decision outcome
  -- Values: 'pending', 'good', 'bad', 'neutral', 'unknown'
  outcome_status TEXT DEFAULT 'pending',

  -- User notes about the outcome
  outcome_notes TEXT,

  -- When the outcome was recorded
  outcome_recorded_at TIMESTAMPTZ,

  -- Optional rating (1-5 stars)
  outcome_rating INTEGER CHECK (outcome_rating >= 1 AND outcome_rating <= 5),

  -- ===== ANALYTICS METADATA =====
  -- Total tokens used across all models
  total_tokens INTEGER,

  -- Total cost in USD
  total_cost DECIMAL(10,6),

  -- Time taken for debate in milliseconds
  debate_duration_ms INTEGER,

  -- Client info (browser, device, etc.)
  client_info JSONB DEFAULT '{}'
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- User lookup (most common query pattern)
CREATE INDEX IF NOT EXISTS idx_decisions_user_id
  ON public.decisions(user_id);

-- Domain filtering
CREATE INDEX IF NOT EXISTS idx_decisions_domain
  ON public.decisions(domain);

-- Timeline browsing (newest first)
CREATE INDEX IF NOT EXISTS idx_decisions_created_at
  ON public.decisions(created_at DESC);

-- Outcome analytics
CREATE INDEX IF NOT EXISTS idx_decisions_outcome_status
  ON public.decisions(outcome_status);

-- Full-text search on query
CREATE INDEX IF NOT EXISTS idx_decisions_query_search
  ON public.decisions USING gin(to_tsvector('english', query));

-- Full-text search on title
CREATE INDEX IF NOT EXISTS idx_decisions_title_search
  ON public.decisions USING gin(to_tsvector('english', COALESCE(title, '')));

-- Composite index for user + domain filtering
CREATE INDEX IF NOT EXISTS idx_decisions_user_domain
  ON public.decisions(user_id, domain);

-- Tags array search
CREATE INDEX IF NOT EXISTS idx_decisions_tags
  ON public.decisions USING gin(tags);

-- Models used array search (for model analytics)
CREATE INDEX IF NOT EXISTS idx_decisions_models
  ON public.decisions USING gin(models_used);

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- Enable RLS
ALTER TABLE public.decisions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own decisions
CREATE POLICY "Users can view own decisions"
  ON public.decisions
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own decisions
CREATE POLICY "Users can insert own decisions"
  ON public.decisions
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own decisions (for outcome tracking)
CREATE POLICY "Users can update own decisions"
  ON public.decisions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Policy: Users can delete their own decisions
CREATE POLICY "Users can delete own decisions"
  ON public.decisions
  FOR DELETE
  USING (auth.uid() = user_id);

-- Policy: Allow anonymous inserts (for users without accounts)
-- Remove this if you require authentication
CREATE POLICY "Allow anonymous inserts"
  ON public.decisions
  FOR INSERT
  WITH CHECK (user_id IS NULL);

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_decisions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_decisions_updated_at ON public.decisions;
CREATE TRIGGER trigger_decisions_updated_at
  BEFORE UPDATE ON public.decisions
  FOR EACH ROW
  EXECUTE FUNCTION update_decisions_updated_at();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to search decisions by query text
CREATE OR REPLACE FUNCTION search_decisions(
  search_query TEXT,
  user_uuid UUID DEFAULT NULL,
  domain_filter TEXT DEFAULT NULL,
  limit_count INTEGER DEFAULT 20
)
RETURNS SETOF public.decisions AS $$
BEGIN
  RETURN QUERY
  SELECT *
  FROM public.decisions
  WHERE
    (user_uuid IS NULL OR user_id = user_uuid)
    AND (domain_filter IS NULL OR domain = domain_filter)
    AND (
      to_tsvector('english', query) @@ plainto_tsquery('english', search_query)
      OR to_tsvector('english', COALESCE(title, '')) @@ plainto_tsquery('english', search_query)
      OR query ILIKE '%' || search_query || '%'
    )
  ORDER BY created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get model performance stats
CREATE OR REPLACE FUNCTION get_model_performance(
  user_uuid UUID DEFAULT NULL
)
RETURNS TABLE (
  model TEXT,
  total_decisions BIGINT,
  good_outcomes BIGINT,
  bad_outcomes BIGINT,
  pending_outcomes BIGINT,
  success_rate DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    unnest(d.models_used) AS model,
    COUNT(*)::BIGINT AS total_decisions,
    COUNT(*) FILTER (WHERE d.outcome_status = 'good')::BIGINT AS good_outcomes,
    COUNT(*) FILTER (WHERE d.outcome_status = 'bad')::BIGINT AS bad_outcomes,
    COUNT(*) FILTER (WHERE d.outcome_status = 'pending')::BIGINT AS pending_outcomes,
    CASE
      WHEN COUNT(*) FILTER (WHERE d.outcome_status IN ('good', 'bad')) > 0
      THEN ROUND(
        COUNT(*) FILTER (WHERE d.outcome_status = 'good')::DECIMAL /
        COUNT(*) FILTER (WHERE d.outcome_status IN ('good', 'bad'))::DECIMAL * 100,
        2
      )
      ELSE NULL
    END AS success_rate
  FROM public.decisions d
  WHERE user_uuid IS NULL OR d.user_id = user_uuid
  GROUP BY unnest(d.models_used)
  ORDER BY total_decisions DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================================================

-- Uncomment to insert a test record
/*
INSERT INTO public.decisions (
  user_id,
  query,
  domain,
  debate_session,
  models_used,
  final_recommendation,
  confidence_score,
  total_tokens,
  debate_duration_ms
) VALUES (
  NULL,  -- Anonymous user
  'Should I invest in Tesla stock for long-term growth?',
  'trading',
  '{"agents": [], "rounds": [], "finalSynthesis": {"content": "Based on debate..."}}',
  ARRAY['gpt-4o', 'claude-sonnet-4-20250514', 'gemini-2.0-flash'],
  'Consider a moderate position with dollar-cost averaging due to high volatility.',
  0.75,
  4500,
  12000
);
*/

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check table was created
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE table_name = 'decisions'
ORDER BY ordinal_position;

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'decisions';

-- Check RLS policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'decisions';
