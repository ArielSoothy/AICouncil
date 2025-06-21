import { generateModelPrompt, parseModelResponse } from './lib/prompt-system'

// Test the prompt generation and parsing
export function testPromptSystem() {
  const testQuery = "What are the top 3 AI coding tools for solo entrepreneurs ranked?"
  
  console.log("=== TESTING PROMPT SYSTEM ===\n")
  
  // Test different response lengths
  const modes = ['concise', 'normal', 'detailed'] as const
  
  modes.forEach(mode => {
    console.log(`\n--- ${mode.toUpperCase()} MODE ---`)
    const prompt = generateModelPrompt(testQuery, mode)
    console.log(prompt)
    console.log("\n" + "=".repeat(60))
  })
  
  // Test parsing a sample structured response (normal mode)
  console.log("\n=== TESTING RESPONSE PARSING (Normal Mode) ===\n")
  
  const sampleNormalResponse = `
[MAIN ANSWER]
Renewable energy sources like solar and wind power offer significant environmental and economic benefits. They reduce greenhouse gas emissions, create jobs, and provide energy independence while becoming increasingly cost-competitive with fossil fuels.

[CONFIDENCE: 92%]

[KEY EVIDENCE]
• Multiple studies show renewable energy costs have dropped 70-90% since 2010
• IPCC reports confirm renewables are essential for climate goals
• Job creation data from renewable energy sector shows consistent growth

[LIMITATIONS]
• Storage technology still developing for grid stability
• Initial capital costs can be high for some technologies
• Geographic limitations affect some renewable sources
`

  const parsedNormal = parseModelResponse(sampleNormalResponse)
  console.log("Parsed Normal Response:")
  console.log(JSON.stringify(parsedNormal, null, 2))
  
  // Test parsing a concise response (ultra-brief format)
  console.log("\n=== TESTING RESPONSE PARSING (Concise Mode) ===\n")
  
  const sampleConciseResponse = `
[MAIN ANSWER]
1. GitHub Copilot 2. Cursor 3. Replit

[CONFIDENCE: 88%]
`

  const parsedConcise = parseModelResponse(sampleConciseResponse)
  console.log("Parsed Concise Response:")
  console.log(JSON.stringify(parsedConcise, null, 2))
  
  return { normal: parsedNormal, concise: parsedConcise }
}

// Run the test
if (require.main === module) {
  testPromptSystem()
}
