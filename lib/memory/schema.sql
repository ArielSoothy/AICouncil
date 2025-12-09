-- Memory System Schema for Supabase
-- Three types of memory: Episodic, Semantic, Procedural

-- Enable pgvector extension for similarity search (if not already enabled)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- Episodic Memory Table
-- Stores past debates and interactions
CREATE TABLE IF NOT EXISTS public.episodic_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Core episodic data
  query TEXT NOT NULL,
  query_embedding JSONB, -- Store as JSONB for now, can migrate to vector type later
  agents_used JSONB NOT NULL, -- Array of agent/model names
  consensus_reached TEXT NOT NULL,
  confidence_score FLOAT NOT NULL CHECK (confidence_score >= 0 AND confidence_score <= 1),
  
  -- Additional context
  disagreement_points JSONB,
  resolution_method TEXT,
  total_tokens_used INTEGER NOT NULL,
  estimated_cost DECIMAL(10, 6) NOT NULL,
  response_time_ms INTEGER NOT NULL,
  follow_up_questions JSONB,
  
  -- User feedback
  user_feedback JSONB,
  
  -- Metadata
  metadata JSONB,
  
  -- Indexes for performance
  INDEX idx_episodic_user_id (user_id),
  INDEX idx_episodic_created_at (created_at DESC),
  INDEX idx_episodic_confidence (confidence_score DESC)
);

-- Semantic Memory Table
-- Stores facts and domain knowledge
CREATE TABLE IF NOT EXISTS public.semantic_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Core semantic data
  fact TEXT NOT NULL,
  fact_embedding JSONB, -- Store as JSONB for now
  category TEXT NOT NULL CHECK (category IN ('user_preference', 'domain_knowledge', 'learned_fact')),
  source TEXT NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  
  -- Validation and usage
  validations INTEGER DEFAULT 1,
  last_used TIMESTAMP WITH TIME ZONE,
  contexts JSONB NOT NULL DEFAULT '[]',
  
  -- Metadata
  metadata JSONB,
  
  -- Indexes
  INDEX idx_semantic_user_id (user_id),
  INDEX idx_semantic_category (category),
  INDEX idx_semantic_confidence (confidence DESC),
  
  -- Ensure unique facts per user
  UNIQUE(user_id, fact, category)
);

-- Procedural Memory Table
-- Stores rules and resolution patterns
CREATE TABLE IF NOT EXISTS public.procedural_memory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Core procedural data
  rule_name TEXT NOT NULL,
  condition TEXT NOT NULL, -- When to apply this rule
  action TEXT NOT NULL, -- What to do
  success_rate FLOAT DEFAULT 0 CHECK (success_rate >= 0 AND success_rate <= 1),
  usage_count INTEGER DEFAULT 0,
  
  -- Pattern matching
  query_patterns JSONB NOT NULL DEFAULT '[]',
  
  -- Agent configuration
  agent_configuration JSONB,
  
  -- Metadata
  metadata JSONB,
  
  -- Indexes
  INDEX idx_procedural_user_id (user_id),
  INDEX idx_procedural_success_rate (success_rate DESC),
  INDEX idx_procedural_usage_count (usage_count DESC),
  
  -- Ensure unique rules per user
  UNIQUE(user_id, rule_name)
);

-- Memory Statistics View
CREATE OR REPLACE VIEW memory_statistics AS
SELECT 
  user_id,
  COUNT(*) FILTER (WHERE type = 'episodic') as episodic_count,
  COUNT(*) FILTER (WHERE type = 'semantic') as semantic_count,
  COUNT(*) FILTER (WHERE type = 'procedural') as procedural_count,
  AVG(confidence_score) FILTER (WHERE type = 'episodic') as avg_episodic_confidence,
  AVG(confidence) FILTER (WHERE type = 'semantic') as avg_semantic_confidence,
  AVG(success_rate) FILTER (WHERE type = 'procedural') as avg_procedural_success
FROM (
  SELECT user_id, 'episodic' as type, confidence_score, NULL as confidence, NULL as success_rate FROM episodic_memory
  UNION ALL
  SELECT user_id, 'semantic' as type, NULL, confidence, NULL FROM semantic_memory
  UNION ALL
  SELECT user_id, 'procedural' as type, NULL, NULL, success_rate FROM procedural_memory
) combined_memory
GROUP BY user_id;

-- Row Level Security Policies
ALTER TABLE public.episodic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.semantic_memory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.procedural_memory ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own memories
CREATE POLICY "Users can view own episodic memories" ON public.episodic_memory
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own episodic memories" ON public.episodic_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own episodic memories" ON public.episodic_memory
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own episodic memories" ON public.episodic_memory
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Repeat for semantic memory
CREATE POLICY "Users can view own semantic memories" ON public.semantic_memory
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own semantic memories" ON public.semantic_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own semantic memories" ON public.semantic_memory
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own semantic memories" ON public.semantic_memory
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Repeat for procedural memory
CREATE POLICY "Users can view own procedural memories" ON public.procedural_memory
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own procedural memories" ON public.procedural_memory
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own procedural memories" ON public.procedural_memory
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own procedural memories" ON public.procedural_memory
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- Training Data Table
-- Stores high-quality debate data for model training
CREATE TABLE IF NOT EXISTS public.training_data (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL, -- Keep data even if user deleted
  
  -- Input data
  query TEXT NOT NULL,
  context TEXT,
  query_type TEXT,
  
  -- Model responses
  model_responses JSONB NOT NULL, -- Array of model responses with metadata
  
  -- Consensus output
  consensus JSONB NOT NULL, -- Final answer, confidence, agreements, disagreements
  
  -- User feedback
  user_feedback JSONB,
  
  -- Metadata
  metadata JSONB NOT NULL,
  quality_score FLOAT DEFAULT 0 CHECK (quality_score >= 0 AND quality_score <= 1),
  
  -- Indexes
  INDEX idx_training_quality (quality_score DESC),
  INDEX idx_training_created (created_at DESC),
  INDEX idx_training_user (user_id)
);

-- Row Level Security for training data
ALTER TABLE public.training_data ENABLE ROW LEVEL SECURITY;

-- Users can only see their own training data
CREATE POLICY "Users can view own training data" ON public.training_data
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Only authenticated users can insert training data
CREATE POLICY "Authenticated users can insert training data" ON public.training_data
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Function to clean old memories (optional, for maintenance)
CREATE OR REPLACE FUNCTION clean_old_memories(days_to_keep INTEGER DEFAULT 90)
RETURNS void AS $$
BEGIN
  -- Delete old episodic memories with low confidence
  DELETE FROM episodic_memory 
  WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
  AND confidence_score < 0.5;
  
  -- Delete unused semantic memories
  DELETE FROM semantic_memory
  WHERE last_used < NOW() - INTERVAL '1 day' * days_to_keep
  OR (last_used IS NULL AND created_at < NOW() - INTERVAL '1 day' * days_to_keep);
  
  -- Delete failed procedural memories
  DELETE FROM procedural_memory
  WHERE success_rate < 0.3 
  AND usage_count > 10;
END;
$$ LANGUAGE plpgsql;