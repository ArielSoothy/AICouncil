import dotenv from 'dotenv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

const SQL_TO_RUN = `
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_paper_trades_mode ON paper_trades(mode);
CREATE INDEX IF NOT EXISTS idx_paper_trades_executed_at ON paper_trades(executed_at);
CREATE INDEX IF NOT EXISTS idx_paper_trades_symbol ON paper_trades(symbol);
`;

async function main() {
  console.log('=== STEP 10: VERIFY DATABASE TABLE ===\n');

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Checking if paper_trades table exists...\n');

    // Try to query the table
    const { count, error } = await supabase
      .from('paper_trades')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Table does not exist or is not accessible');
      console.error('Error:', error.message);
      console.log('\n📋 PLEASE RUN THIS SQL IN SUPABASE DASHBOARD:');
      console.log('━'.repeat(60));
      console.log(SQL_TO_RUN);
      console.log('━'.repeat(60));
      console.log('\n📍 Dashboard URL:');
      console.log('https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/sql');
      console.log('\nAfter running the SQL, run this script again to verify.');
      process.exit(1);
    }

    console.log('✅ Table exists and is accessible!');
    console.log('Current row count:', count);
    console.log('\n✅ DATABASE SETUP COMPLETE!');
    console.log('You can now run the END-TO-END test.');

  } catch (error) {
    console.error('\n❌ VERIFICATION FAILED:', error);
    process.exit(1);
  }
}

main();
