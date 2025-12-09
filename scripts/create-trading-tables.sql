-- Paper Trades Table
CREATE TABLE IF NOT EXISTS paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(30) NOT NULL, -- 'individual_claude', 'individual_gpt4', 'consensus', 'debate'
  symbol VARCHAR(10) NOT NULL,
  action VARCHAR(10) NOT NULL, -- BUY, SELL, HOLD
  quantity INTEGER,
  price DECIMAL(10,2),
  reasoning TEXT, -- Full model response/debate
  confidence DECIMAL(3,2),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alpaca_order_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_paper_trades_mode ON paper_trades(mode);
CREATE INDEX IF NOT EXISTS idx_paper_trades_executed_at ON paper_trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON paper_trades(symbol);

-- Comment on table
COMMENT ON TABLE paper_trades IS 'Stores all paper trading transactions from AI models';
