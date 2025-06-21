import { generateModelPrompt } from './lib/prompt-system'

console.log('=== TESTING CONCISE PROMPT ===')
const prompt = generateModelPrompt('What are the top 3 AI coding tools for solo entrepreneurs ranked?', 'concise')
console.log(prompt)
console.log('\n=== CONTAINS STRICT WARNINGS? ===')
console.log('Contains "NO disclaimers":', prompt.includes('NO disclaimers'))
console.log('Contains "FINAL REMINDER":', prompt.includes('FINAL REMINDER'))
console.log('Contains "OUTPUT ONLY":', prompt.includes('OUTPUT ONLY'))
