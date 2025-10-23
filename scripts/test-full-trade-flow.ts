import dotenv from 'dotenv';
import { getAccount, placeMarketOrder, saveTrade } from '../lib/alpaca/client';
import { generateTradingPrompt } from '../lib/alpaca/prompts';
import { AnthropicProvider } from '../lib/ai-providers/anthropic';
import type { TradeDecision } from '../lib/alpaca/types';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Claude provider
const claudeProvider = new AnthropicProvider();

async function main() {
  console.log('=== STEP 12: END-TO-END TRADE FLOW TEST ===\n');
  console.log('⚠️  This will execute a REAL paper trade!\n');
  console.log('━'.repeat(60));

  try {
    // Step 1: Get account
    console.log('\n1️⃣ Getting account info...');
    const account = await getAccount();
    console.log('   Balance: $' + account.portfolio_value);

    // Step 2: Generate prompt
    console.log('\n2️⃣ Generating trading prompt...');
    const prompt = generateTradingPrompt(account, [], new Date().toISOString().split('T')[0]);
    console.log('   Prompt ready');

    // Step 3: Get AI decision
    console.log('\n3️⃣ Asking Claude for trade decision...');
    const result = await claudeProvider.query(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      temperature: 0.7,
      maxTokens: 200,
    });

    const decision: TradeDecision = JSON.parse(result.response);
    console.log('   Action:', decision.action);
    console.log('   Symbol:', decision.symbol || 'N/A');
    console.log('   Quantity:', decision.quantity || 'N/A');
    console.log('   Reasoning:', decision.reasoning);
    console.log('   Confidence:', decision.confidence);

    // Step 4: Execute trade (if not HOLD)
    if (decision.action === 'HOLD') {
      console.log('\n4️⃣ No trade executed (HOLD decision)\n');
      console.log('✅ TEST PASSED - Flow completed successfully!');
      return;
    }

    console.log('\n4️⃣ Executing trade on Alpaca...');
    const order = await placeMarketOrder(
      decision.symbol,
      decision.quantity,
      decision.action === 'BUY' ? 'buy' : 'sell'
    );
    console.log('   Order ID:', order.id);
    console.log('   Status:', order.status);

    // Step 5: Wait for order to fill and get filled price
    console.log('\n5️⃣ Waiting for order to fill...');

    // Poll order status until filled
    const Alpaca = (await import('@alpacahq/alpaca-trade-api')).default;
    const alpaca = new Alpaca({
      keyId: process.env.ALPACA_API_KEY!,
      secretKey: process.env.ALPACA_SECRET_KEY!,
      paper: true,
    });

    let filledOrder = await alpaca.getOrder(order.id);
    let attempts = 0;
    const maxAttempts = 10;

    while (filledOrder.status !== 'filled' && attempts < maxAttempts) {
      console.log(`   Status: ${filledOrder.status}, waiting... (${attempts + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
      filledOrder = await alpaca.getOrder(order.id);
      attempts++;
    }

    const filledPrice = parseFloat(filledOrder.filled_avg_price || '0');
    console.log('   Order status:', filledOrder.status);
    console.log('   Order filled at price: $' + filledPrice);

    // Step 6: Save to database
    console.log('\n6️⃣ Saving to database...');
    await saveTrade(
      'individual_claude',
      decision.symbol,
      decision.action,
      decision.quantity,
      filledPrice,
      decision.reasoning,
      decision.confidence,
      order.id
    );
    console.log('   Database record created');

    // Step 7: Verify final balance
    console.log('\n7️⃣ Verifying final balance...');
    const finalAccount = await getAccount();
    console.log('   Final balance: $' + finalAccount.portfolio_value);

    console.log('\n' + '━'.repeat(60));
    console.log('✅ END-TO-END TEST PASSED!');
    console.log('━'.repeat(60));
    console.log('🎉 Claude successfully executed a paper trade!');
    console.log('==========================================');
    console.log('Check Alpaca: https://app.alpaca.markets/paper/dashboard/portfolio');
    console.log('Check Supabase: SELECT * FROM paper_trades ORDER BY created_at DESC LIMIT 1;');
    console.log('==========================================');

  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
