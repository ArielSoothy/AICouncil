const { google } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function testGoogle() {
  try {
    console.log('Testing Google AI with API key:', process.env.GOOGLE_AI_API_KEY ? 'Present' : 'Missing');
    
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: 'What is 2+2?',
      maxTokens: 100,
    });

    console.log('Success!');
    console.log('Response:', result.text);
    console.log('Usage:', result.usage);
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Full error:', error);
  }
}

testGoogle();
