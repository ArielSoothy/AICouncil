// Quick debug script to test JSON parsing issue
// Run with: node debug-json-parsing.js

// Sample response from logs that should be parseable
const testResponse = `{
  "agent_id": "analyst-001",
  "role": "analyst",
  "round": 1,
  "timestamp": "2025-09-08T14:42:39.977Z",
  "summary": "Based on data analysis, I recommend the top 3 scooters for value, reliability, and comfort, suitable for a drive from Tel Aviv to Jerusalem and Eilat.",
  "claims": [
    {
      "id": "claim_1",
      "type": "factual",
      "statement": "The top 3 scooters for value, reliability, and comfort under 500cc and up to 20k shekels are the Honda PCX 150, Yamaha SMAX 155, and Suzuki Burgman 200.",
      "importance": "major",
      "supporting_evidence_ids": ["evidence_1", "evidence_2"],
      "confidence": 0.9,
      "confidence_factors": {
        "evidence_quality": 0.8,
        "logical_soundness": 0.9,
        "source_reliability": 0.8
      }
    }
  ],
  "evidence": [
    {
      "id": "evidence_1",
      "type": "fact",
      "content": "According to a study by the Israeli Ministry of Transportation, the Honda PCX 150 has an average mileage capacity of 200,000 km.",
      "source": {
        "type": "web",
        "name": "Israeli Ministry of Transportation",
        "credibility_score": 0.8
      },
      "verification_status": "verified",
      "relevance_score": 0.9,
      "reliability_score": 0.8
    }
  ],
  "reasoning": {
    "steps": [
      {
        "step_number": 1,
        "description": "Based on data analysis, the top 3 scooters for value, reliability, and comfort under 500cc and up to 20k shekels are identified.",
        "type": "premise",
        "based_on_evidence": ["evidence_1"],
        "confidence": 0.85
      }
    ],
    "conclusion": "The Honda PCX 150 is recommended as the top choice.",
    "logical_structure": "deductive",
    "coherence_score": 0.9
  },
  "rebuttals": [],
  "confidence": {
    "overall": 0.9,
    "factual_accuracy": 0.95,
    "logical_soundness": 0.9,
    "evidence_quality": 0.9,
    "completeness": 0.8,
    "confidence_rationale": "High-quality data from authoritative source"
  },
  "self_critique": {
    "potential_weaknesses": ["Limited to one data source"],
    "alternative_viewpoints": ["Some regions may have different cost trajectories"],
    "missing_information": ["Grid integration costs"],
    "critique_impact": "modifies_confidence"
  },
  "uncertainties": ["Future policy changes"],
  "sources_cited": [
    {
      "type": "web",
      "name": "Israeli Ministry of Transportation"
    }
  ],
  "tokens_used": 150,
  "processing_time_ms": 1200
}`;

console.log('🧪 Testing JSON parsing...\n')

// Test 1: Basic JSON parsing
console.log('Test 1: Basic JSON.parse()')
try {
  const parsed = JSON.parse(testResponse)
  console.log('✅ JSON.parse() success')
  console.log('✅ agent_id:', parsed.agent_id)
  console.log('✅ summary:', parsed.summary.substring(0, 50) + '...')
} catch (error) {
  console.log('❌ JSON.parse() failed:', error.message)
}

// Test 2: Test the extraction logic from ResponseParser
console.log('\nTest 2: Extraction logic (first { to last })')
function cleanJSONResponse(response) {
  let cleaned = response.trim()
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/g, '')
  cleaned = cleaned.replace(/```\s*/g, '')
  
  // Simple extraction: first { to last }
  const firstBrace = cleaned.indexOf('{')
  const lastBrace = cleaned.lastIndexOf('}')
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonCandidate = cleaned.substring(firstBrace, lastBrace + 1)
    return jsonCandidate
  } else {
    throw new Error('No valid JSON structure found')
  }
}

try {
  const cleaned = cleanJSONResponse(testResponse)
  console.log('✅ JSON extraction success')
  console.log('✅ Extracted length:', cleaned.length)
  
  // Try parsing the extracted JSON
  const parsed = JSON.parse(cleaned)
  console.log('✅ Extracted JSON parses successfully')
  console.log('✅ agent_id:', parsed.agent_id)
} catch (error) {
  console.log('❌ JSON extraction/parsing failed:', error.message)
}

// Test 3: Test with actual server response format (with \n escapes)
console.log('\nTest 3: Server response format (with \\n escapes)')
const serverResponse = `{"agent_id":"analyst-001","role":"analyst","round":1,"timestamp":"2025-09-08T14:42:39.977Z","summary":"Based on data analysis, I recommend the top 3 scooters for value, reliability, and comfort, suitable for a drive from Tel Aviv to Jerusalem and Eilat.","claims":[{"id":"claim_1","type":"factual","statement":"The top 3 scooters for value, reliability, and comfort under 500cc and up to 20k shekels are the Honda PCX 150, Yamaha SMAX 155, and Suzuki Burgman 200.","importance":"major","supporting_evidence_ids":["evidence_1","evidence_2"],"confidence":0.9,"confidence_factors":{"evidence_quality":0.8,"logical_soundness":0.9,"source_reliability":0.8}}],"evidence":[{"id":"evidence_1","type":"fact","content":"According to a study by the Israeli Ministry of Transportation, the Honda PCX 150 has an average mileage capacity of 200,000 km.","source":{"type":"web","name":"Israeli Ministry of Transportation","credibility_score":0.8},"verification_status":"verified","relevance_score":0.9,"reliability_score":0.8}],"reasoning":{"steps":[{"step_number":1,"description":"Based on data analysis, the top 3 scooters for value, reliability, and comfort under 500cc and up to 20k shekels are identified.","type":"premise","based_on_evidence":["evidence_1"],"confidence":0.85}],"conclusion":"The Honda PCX 150 is recommended as the top choice.","logical_structure":"deductive","coherence_score":0.9},"rebuttals":[],"confidence":{"overall":0.9,"factual_accuracy":0.95,"logical_soundness":0.9,"evidence_quality":0.9,"completeness":0.8,"confidence_rationale":"High-quality data from authoritative source"},"self_critique":{"potential_weaknesses":["Limited to one data source"],"alternative_viewpoints":["Some regions may have different cost trajectories"],"missing_information":["Grid integration costs"],"critique_impact":"modifies_confidence"},"uncertainties":["Future policy changes"],"sources_cited":[{"type":"web","name":"Israeli Ministry of Transportation"}],"tokens_used":150,"processing_time_ms":1200}`;

try {
  const parsed = JSON.parse(serverResponse)
  console.log('✅ Server format JSON parses successfully')
  console.log('✅ agent_id:', parsed.agent_id)
  console.log('✅ summary:', parsed.summary.substring(0, 50) + '...')
} catch (error) {
  console.log('❌ Server format JSON parsing failed:', error.message)
}

console.log('\n🎉 Debug test completed!')