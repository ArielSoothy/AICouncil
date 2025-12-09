import dotenv from 'dotenv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('=== TABLE DIAGNOSIS ===\n');

  const supabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Try to query using RPC to get table info
  console.log('Attempting to query paper_trades...\n');

  const { data, error, count } = await supabase
    .from('paper_trades')
    .select('*', { count: 'exact' });

  console.log('Query result:');
  console.log('- Error:', error);
  console.log('- Count:', count);
  console.log('- Data:', data);
  console.log('- Data length:', data?.length);

  if (error) {
    console.log('\n❌ Cannot query table');
    console.log('This usually means:');
    console.log('1. Table doesn\'t exist');
    console.log('2. RLS is enabled and blocking access');
    console.log('3. Network/connection issue');
  } else {
    console.log('\n✅ Table is accessible');
    if (count === 0) {
      console.log('Table is empty (no rows)');
    } else if (count === null) {
      console.log('⚠️  Count is NULL (unusual - might indicate RLS issue)');
    } else {
      console.log(`Table has ${count} rows`);
    }
  }

  console.log('\n📋 NEXT STEPS:');
  console.log('1. Go to: https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/editor');
  console.log('2. Find the "paper_trades" table');
  console.log('3. Check if RLS is enabled (shield icon should be OFF/grey)');
  console.log('4. If RLS is enabled, run: scripts/fix-rls-policy.sql in SQL Editor');
  console.log('   SQL Editor: https://supabase.com/dashboard/project/dslmwsdbkaciwljnxxjt/sql');
}

main();
