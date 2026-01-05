-- Screening Scans History Table
-- Run this in Supabase SQL Editor (only once!)

CREATE TABLE IF NOT EXISTS screening_scans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scanned_at TIMESTAMPTZ DEFAULT NOW(),
  scanner_type TEXT DEFAULT 'most_active',
  filters JSONB,
  stocks JSONB,
  stocks_count INT,
  execution_time_seconds FLOAT,
  notes TEXT
);

-- Index for faster queries by date
CREATE INDEX IF NOT EXISTS idx_screening_scans_date ON screening_scans(scanned_at DESC);

-- Enable RLS (Row Level Security) - optional for now since single user
ALTER TABLE screening_scans ENABLE ROW LEVEL SECURITY;

-- Allow all operations for now (single user setup)
CREATE POLICY "Allow all for screening_scans" ON screening_scans
  FOR ALL USING (true) WITH CHECK (true);

-- Grant access
GRANT ALL ON screening_scans TO anon, authenticated;
