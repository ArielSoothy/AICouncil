-- AI Council Database Schema
-- Run these commands in your Supabase SQL editor

-- Enable Row Level Security (RLS) for all tables
-- This ensures users can only access their own data

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'enterprise')),
  premium_credits INTEGER DEFAULT 5, -- Free users get 5 premium credits to try ALL models
  queries_today INTEGER DEFAULT 0, -- Track daily usage
  last_query_date DATE DEFAULT CURRENT_DATE, -- Reset daily counter
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Conversations table
CREATE TABLE public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  responses JSONB NOT NULL, -- Store all model responses and consensus data
  evaluation_data JSONB, -- Store structured evaluation data for testing/training (optional)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- evaluation_data structure for model training and evaluation:
-- {
--   "query_type": "factual|reasoning|creative|mathematical|...",
--   "mode": "single|consensus|debate",
--   "agent_verdicts": [
--     {"agent": "analyst", "verdict": "...", "confidence": 0.85},
--     {"agent": "critic", "verdict": "...", "confidence": 0.72},
--     {"agent": "synthesizer", "verdict": "...", "confidence": 0.91}
--   ],
--   "consensus_verdict": "final agreed upon answer",
--   "confidence_scores": {
--     "overall": 0.89,
--     "agreement_level": 0.76,
--     "certainty": 0.84
--   },
--   "reasoning_chain": ["step1", "step2", "step3"],
--   "disagreement_points": ["point1", "point2"],
--   "metadata": {
--     "models_used": ["gpt-4", "claude-3.5-sonnet", "gemini-1.5-pro"],
--     "providers_used": ["openai", "anthropic", "google"],
--     "total_cost": 0.001,
--     "response_time_ms": 2500,
--     "rounds_executed": 2,
--     "auto_trigger_round_2": true,
--     "timestamp": "2025-01-09T12:34:56Z",
--     "is_guest_session": false
--   },
--   "ground_truth": null, // For future manual validation
--   "training_ready": true // Flag for ML pipeline compatibility
-- }

-- Feedback table
CREATE TABLE public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE CASCADE NOT NULL,
  user_rating INTEGER CHECK (user_rating >= 1 AND user_rating <= 5),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can only see and update their own profile
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Users can only see their own conversations
CREATE POLICY "Users can view own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own conversations" ON public.conversations
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own conversations" ON public.conversations
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own conversations" ON public.conversations
  FOR DELETE USING (auth.uid() = user_id);

-- Users can only see feedback for their own conversations
CREATE POLICY "Users can view feedback for own conversations" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = feedback.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert feedback for own conversations" ON public.feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations 
      WHERE conversations.id = feedback.conversation_id 
      AND conversations.user_id = auth.uid()
    )
  );

-- Indexes for better performance
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_feedback_conversation_id ON public.feedback(conversation_id);

-- Function to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create user profile on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to update updated_at
CREATE TRIGGER update_users_updated_at 
  BEFORE UPDATE ON public.users 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at 
  BEFORE UPDATE ON public.conversations 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();