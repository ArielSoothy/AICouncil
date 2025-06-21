const { google } = require('@ai-sdk/google');
const { generateText } = require('ai');

async function testGoogleDirect() {
  try {
    console.log('Testing Google AI...');
    console.log('API Key present:', !!process.env.GOOGLE_AI_API_KEY);
    console.log('API Key starts with AIza:', process.env.GOOGLE_AI_API_KEY?.startsWith('AIza'));
    
    const result = await generateText({
      model: google('gemini-1.5-flash'),
      prompt: 'What is 2+2? Please answer briefly.',
      maxTokens: 50,
    });

    console.log('✅ Success!');
    console.log('Response:', result.text);
    console.log('Usage:', result.usage);
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testGoogleDirect();
