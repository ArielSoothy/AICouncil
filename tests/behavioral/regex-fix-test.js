#!/usr/bin/env node

/**
 * Regex Fix Test
 * 
 * Test the corrected regex that handles variable spaces after the period.
 */

console.log('🎯 Regex Fix Test');
console.log('Testing corrected regex: /^\\s*\\d+\\.\\s*/gm\n');

// Your exact example
const userExample = `while noting the inherent trade-offs for very long-distance comfort at this engine capacity.
1.  Honda PCX 150
2.  Yamaha SMAX 155
3.  Suzuki Burgman 200
The Honda PCX 150 is recommended for its highly reliable engine and lowest average annual maintenance cost according to IAA data, making it a strong contender for overall value.`;

console.log('📋 Original text:');
console.log(userExample);
console.log('\n' + '='.repeat(50));

// Test old regex (broken)
const oldRegex = /^\s*\d+\.\s+/gm;
const oldResult = userExample.replace(oldRegex, '• ');
console.log('❌ Old regex /^\\s*\\d+\\.\\s+/gm result:');
console.log(oldResult.substring(0, 200) + '...');

// Test new regex (fixed)
const newRegex = /^\s*\d+\.\s*/gm;
const newResult = userExample.replace(newRegex, '• ');
console.log('\n✅ New regex /^\\s*\\d+\\.\\s*/gm result:');
console.log(newResult.substring(0, 200) + '...');

// Verify the fix
const stillHasNumbers = /^\s*\d+\.\s*/gm.test(newResult);
const hasBullets = /^\s*•\s*/gm.test(newResult);

console.log('\n📊 Results:');
console.log(`Still has numbered lists: ${stillHasNumbers ? '❌ YES' : '✅ NO'}`);
console.log(`Has bullet points: ${hasBullets ? '✅ YES' : '❌ NO'}`);

if (!stillHasNumbers && hasBullets) {
  console.log('\n🎉 SUCCESS: Regex fix works correctly!');
  console.log('The Agent Debate preview will now show:');
  console.log('• Honda PCX 150');
  console.log('• Yamaha SMAX 155');
  console.log('• Suzuki Burgman 200');
  process.exit(0);
} else {
  console.log('\n❌ FAILED: Regex still needs adjustment');
  process.exit(1);
}