// @ts-nocheck
// DEPRECATED: This script is not used - table was created manually in Supabase dashboard
import dotenv from 'dotenv';
// import fetch from 'node-fetch'; // Not used - table creation done manually

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

-- Disable RLS for development
ALTER TABLE paper_trades DISABLE ROW LEVEL SECURITY;
`;

async function main() {
  console.log('=== CREATING TABLE PROGRAMMATICALLY ===\n');

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    // Use Supabase REST API to execute SQL
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceRoleKey,
        'Authorization': `Bearer ${serviceRoleKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: SQL_TO_RUN })
    });

    if (!response.ok) {
      // RPC endpoint might not exist, try direct SQL execution via PostgREST
      console.log('RPC method not available, trying alternative approach...\n');

      console.log('📋 PLEASE RUN THIS SQL IN SUPABASE DASHBOARD:');
      console.log('━'.repeat(60));
      console.log(SQL_TO_RUN);
      console.log('━'.repeat(60));
      console.log('\n📍 Dashboard SQL Editor:');
      console.log('https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/sql');
      console.log('\n✅ After running the SQL, run: npx tsx scripts/test-database-insert.ts');
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ Table created successfully!');
    console.log('Result:', result);

    // Verify table was created
    console.log('\nVerifying table...');
    const { createClient } = await import('@supabase/supabase-js');
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { count, error } = await supabase
      .from('paper_trades')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }

    console.log('✅ Table verified! Current row count:', count);
    console.log('\n🎉 DATABASE SETUP COMPLETE!');
    console.log('Run: npx tsx scripts/test-database-insert.ts to test');

  } catch (error) {
    console.error('\n❌ FAILED:', error);
    console.log('\n📋 MANUAL ALTERNATIVE:');
    console.log('Go to: https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/sql');
    console.log('And run the SQL from: scripts/create-trading-tables.sql');
    process.exit(1);
  }
}

main();
