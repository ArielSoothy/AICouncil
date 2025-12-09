import dotenv from 'dotenv';
import { testConnection, getAccount } from '../lib/alpaca/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('=== STEP 6: TEST getAccount() ===\n');

  try {
    // Test 1: Connection
    await testConnection();

    // Test 2: Get Account
    console.log('\n📊 Testing getAccount() function...');
    const account = await getAccount();
    console.log('\n✅ getAccount() works!');
    console.log('Balance:', account.portfolio_value);
    console.log('Cash:', account.cash);
    console.log('Buying Power:', account.buying_power);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
