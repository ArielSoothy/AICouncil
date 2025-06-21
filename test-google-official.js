const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGoogleAIDirect() {
  try {
    console.log('🧪 Testing Google AI directly...');
    
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || 'AIzaSyACwVcQ0ogjkD0qF2a4R50h1-sxEpqT74Y';
    console.log('API Key present:', !!apiKey);
    console.log('API Key format:', apiKey.substring(0, 8) + '...');
    
    // Initialize the Google AI client
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Get the model - try with the latest model name
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    // Generate content
    console.log('🤖 Sending request to gemini-1.5-flash...');
    const result = await model.generateContent('What is 2+2? Answer briefly.');
    
    const response = await result.response;
    const text = response.text();
    
    console.log('✅ SUCCESS!');
    console.log('Response:', text);
    console.log('Response length:', text.length);
    
  } catch (error) {
    console.error('❌ ERROR:', error.message);
    if (error.status) {
      console.error('Status:', error.status);
    }
    if (error.details) {
      console.error('Details:', error.details);
    }
  }
}

testGoogleAIDirect();
