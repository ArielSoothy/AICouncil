-- Fix Arena Mode Trigger Function
-- The bug: First trade's P&L was not included in INSERT, only in ON CONFLICT UPDATE
-- This caused all models to show $0.00 despite having trades with P&L

CREATE OR REPLACE FUNCTION update_model_performance()
RETURNS TRIGGER AS $$
BEGIN
  -- Only update if trade has closed (has P&L)
  IF NEW.pnl IS NOT NULL THEN
    INSERT INTO model_performance (
      model_id, model_name, provider,
      total_trades, winning_trades, losing_trades, total_pnl, win_rate, last_trade_at
    )
    VALUES (
      NEW.model_id, NEW.model_name, NEW.provider,
      1,  -- First trade
      CASE WHEN NEW.pnl > 0 THEN 1 ELSE 0 END,  -- winning_trades
      CASE WHEN NEW.pnl < 0 THEN 1 ELSE 0 END,  -- losing_trades
      NEW.pnl,  -- Include P&L from first trade (THIS WAS MISSING!)
      CASE WHEN NEW.pnl > 0 THEN 100.0 ELSE 0.0 END,  -- win_rate (100% if first trade wins)
      NEW.exit_at  -- last_trade_at
    )
    ON CONFLICT (model_id) DO UPDATE SET
      total_trades = model_performance.total_trades + 1,
      winning_trades = model_performance.winning_trades + CASE WHEN NEW.pnl > 0 THEN 1 ELSE 0 END,
      losing_trades = model_performance.losing_trades + CASE WHEN NEW.pnl < 0 THEN 1 ELSE 0 END,
      total_pnl = model_performance.total_pnl + NEW.pnl,
      win_rate = CASE
        WHEN model_performance.total_trades + 1 > 0 THEN
          ((model_performance.winning_trades + CASE WHEN NEW.pnl > 0 THEN 1 ELSE 0 END)::NUMERIC /
           (model_performance.total_trades + 1)::NUMERIC) * 100
        ELSE 0
      END,
      last_trade_at = NEW.exit_at,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Reset model_performance to clear the zeros (optional but recommended)
DELETE FROM model_performance;

-- Now re-run the Arena Mode to test the fixed trigger!
