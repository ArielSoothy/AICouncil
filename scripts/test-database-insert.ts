import dotenv from 'dotenv';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('=== DATABASE INSERT TEST ===\n');

  try {
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('Testing database connection...');
    console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('Service Role Key:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 20) + '...');

    // Test 1: Can we query the table?
    console.log('\n1️⃣ Testing table query...');
    const { count, error: queryError } = await supabase
      .from('paper_trades')
      .select('*', { count: 'exact', head: true });

    if (queryError) {
      console.error('❌ Query failed:', queryError);
    } else {
      console.log('✅ Table exists! Row count:', count);
    }

    // Test 2: Try simple insert
    console.log('\n2️⃣ Testing simple insert...');
    const testData = {
      mode: 'test_mode',
      symbol: 'TEST',
      action: 'BUY',
      quantity: 1,
      price: 100.50,
      reasoning: 'Test insert',
      confidence: 0.85,
      alpaca_order_id: 'test-order-123',
    };

    console.log('Inserting:', testData);

    const { data, error } = await supabase
      .from('paper_trades')
      .insert(testData)
      .select()
      .single();

    if (error) {
      console.error('\n❌ Insert failed!');
      console.error('Error object type:', typeof error);
      console.error('Error keys:', Object.keys(error));
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      console.error('Full error:', error);
      console.error('Stringified:', JSON.stringify(error, null, 2));
      throw error;
    }

    console.log('\n✅ Insert successful!');
    console.log('Inserted record:', data);

    // Test 3: Verify the insert
    console.log('\n3️⃣ Verifying insert...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('paper_trades')
      .select('*')
      .eq('alpaca_order_id', 'test-order-123')
      .single();

    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
    } else {
      console.log('✅ Record found:', verifyData);
    }

    console.log('\n✅ ALL TESTS PASSED!');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
