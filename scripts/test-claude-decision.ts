import dotenv from 'dotenv';
import { getAccount } from '../lib/alpaca/client';
import { generateTradingPrompt } from '../lib/alpaca/prompts';
import { AnthropicProvider } from '../lib/ai-providers/anthropic';
import type { TradeDecision } from '../lib/alpaca/types';

// Load environment variables
dotenv.config({ path: '.env.local' });

// Initialize Claude provider
const claudeProvider = new AnthropicProvider();

async function main() {
  console.log('=== STEP 9: TEST Claude Trade Decision ===\n');

  try {
    // Step 1: Get account info
    console.log('1️⃣ Getting account info...');
    const account = await getAccount();
    const date = new Date().toISOString().split('T')[0];

    // Step 2: Generate prompt
    console.log('\n2️⃣ Generating trading prompt...');
    const prompt = generateTradingPrompt(account, [], date);
    console.log('   Prompt ready\n');

    // Step 3: Call Claude
    console.log('3️⃣ Asking Claude for trade decision...\n');
    const result = await claudeProvider.query(prompt, {
      model: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      temperature: 0.7,
      maxTokens: 200,
      enabled: true,
    });
    const response = result.response;

    console.log('Claude Response:');
    console.log('━'.repeat(60));
    console.log(response);
    console.log('━'.repeat(60));

    // Step 4: Parse JSON
    try {
      const decision: TradeDecision = JSON.parse(response);
      console.log('\n✅ Valid JSON received!');
      console.log('━'.repeat(60));
      console.log('Action:', decision.action);
      console.log('Symbol:', decision.symbol || 'N/A');
      console.log('Quantity:', decision.quantity || 'N/A');
      console.log('Reasoning:', decision.reasoning);
      console.log('Confidence:', decision.confidence);
      console.log('━'.repeat(60));

      // Validate decision
      if (!['BUY', 'SELL', 'HOLD'].includes(decision.action)) {
        throw new Error(`Invalid action: ${decision.action}`);
      }

      if (decision.action !== 'HOLD' && !decision.symbol) {
        throw new Error('Symbol required for BUY/SELL actions');
      }

      if (decision.action !== 'HOLD' && !decision.quantity) {
        throw new Error('Quantity required for BUY/SELL actions');
      }

      console.log('\n✅ TEST PASSED - Claude returned valid trade decision!');
    } catch (parseError) {
      console.error('\n❌ TEST FAILED - Invalid JSON:', parseError);
      console.error('Raw response was:', response);
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
