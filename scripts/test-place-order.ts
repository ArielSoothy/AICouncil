import dotenv from 'dotenv';
import { getAccount, placeMarketOrder } from '../lib/alpaca/client';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('=== STEP 7: TEST placeMarketOrder() ===\n');
  console.log('⚠️  This will execute a REAL paper trade!\n');

  try {
    // Check balance before
    console.log('1️⃣ Getting account info...');
    const before = await getAccount();
    console.log('   Balance before:', before.portfolio_value, '\n');

    // Place a SMALL test order (1 share of AAPL)
    console.log('2️⃣ Placing order...');
    const order = await placeMarketOrder('AAPL', 1, 'buy');
    console.log('\n✅ Order placed!');
    console.log('   Order ID:', order.id);
    console.log('   Symbol:', order.symbol);
    console.log('   Quantity:', order.qty);
    console.log('   Side:', order.side);
    console.log('   Status:', order.status);

    // Wait 2 seconds for order to fill
    console.log('\n3️⃣ Waiting for order to fill...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Check balance after
    console.log('\n4️⃣ Checking final balance...');
    const after = await getAccount();
    console.log('   Balance after:', after.portfolio_value);
    console.log('   Cash:', after.cash);
    console.log('   Buying power:', after.buying_power);

    console.log('\n✅ TEST PASSED - Order executed successfully!');
    console.log('==========================================');
    console.log('Check your Alpaca dashboard to see the trade!');
    console.log('https://app.alpaca.markets/paper/dashboard/portfolio');
    console.log('==========================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
