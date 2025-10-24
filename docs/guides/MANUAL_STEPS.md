# Manual Database Setup Required

## Problem Found
The `paper_trades` table **does not exist** in your Supabase database.

Error: `relation "public.paper_trades" does not exist`

## Solution (2 minutes)

### Step 1: Open Supabase SQL Editor
Click here: https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/sql

### Step 2: Copy & Paste This SQL

```sql
-- Paper Trades Table
CREATE TABLE IF NOT EXISTS paper_trades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mode VARCHAR(30) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  action VARCHAR(10) NOT NULL,
  quantity INTEGER,
  price DECIMAL(10,2),
  reasoning TEXT,
  confidence DECIMAL(3,2),
  executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  alpaca_order_id VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_paper_trades_mode ON paper_trades(mode);
CREATE INDEX IF NOT EXISTS idx_paper_trades_executed_at ON paper_trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON paper_trades(symbol);

-- Disable RLS for development (service role bypasses RLS anyway)
ALTER TABLE paper_trades DISABLE ROW LEVEL SECURITY;
```

### Step 3: Click "Run" (or press Cmd/Ctrl + Enter)

### Step 4: Verify Success
After running the SQL, run this command to verify:
```bash
npx tsx scripts/diagnose-table.ts
```

You should see: "✅ Table is accessible" and "Table is empty (no rows)"

### Step 5: Continue Testing
Then run the full END-TO-END test:
```bash
npx tsx scripts/test-full-trade-flow.ts
```

## Why This Happened
The `create-database-tables.ts` script only *checks* if the table exists - it doesn't actually create it. This is a safety measure to avoid accidentally recreating tables and losing data.
