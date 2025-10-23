import dotenv from 'dotenv';
import { getAccount } from '../lib/alpaca/client';
import { generateTradingPrompt } from '../lib/alpaca/prompts';

// Load environment variables
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('=== STEP 8: TEST generateTradingPrompt() ===\n');

  try {
    const account = await getAccount();
    const positions = []; // Empty for now
    const date = new Date().toISOString().split('T')[0];

    console.log('\n📝 Generating trading prompt...\n');
    const prompt = generateTradingPrompt(account, positions, date);

    console.log('Generated Prompt:');
    console.log('━'.repeat(60));
    console.log(prompt);
    console.log('━'.repeat(60));

    console.log('\n✅ TEST PASSED - Prompt generated successfully!');
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error);
    process.exit(1);
  }
}

main();
