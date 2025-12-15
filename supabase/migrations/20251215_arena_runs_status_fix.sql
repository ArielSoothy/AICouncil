-- Arena Mode - Fix arena_runs status constraint
-- Created: December 15, 2025
-- Purpose: Add missing status values to arena_runs table

-- ============================================================================
-- Fix the status CHECK constraint to allow all statuses used by the code
-- ============================================================================

-- Drop the old constraint and add a new one with all required statuses
ALTER TABLE arena_runs
DROP CONSTRAINT IF EXISTS arena_runs_status_check;

ALTER TABLE arena_runs
ADD CONSTRAINT arena_runs_status_check
CHECK (status IN (
  'running',
  'completed',
  'failed',
  'stopped',
  'research_complete',
  'has_conflicts',
  'ready_to_execute'
));

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Arena runs status constraint updated to include:';
  RAISE NOTICE '  - running, completed, failed, stopped (original)';
  RAISE NOTICE '  - research_complete, has_conflicts, ready_to_execute (new)';
END $$;
