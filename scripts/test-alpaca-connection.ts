import dotenv from 'dotenv';
import { testConnection } from '../lib/alpaca/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('=== ALPACA CONNECTION TEST ===\n');

  // Debug: Check if env vars are loaded
  console.log('🔍 Environment Check:');
  console.log('ALPACA_API_KEY:', process.env.ALPACA_API_KEY ? `${process.env.ALPACA_API_KEY.substring(0, 5)}...` : 'MISSING');
  console.log('ALPACA_SECRET_KEY:', process.env.ALPACA_SECRET_KEY ? 'SET' : 'MISSING');
  console.log();

  try {
    const account = await testConnection();
    console.log('\n✅ TEST PASSED');
    console.log('Account ID:', account.id);
    console.log('Balance:', account.portfolio_value);
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
