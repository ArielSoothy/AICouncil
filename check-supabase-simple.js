// Simple Supabase connection check
const fetch = require('node:fetch')

const SUPABASE_URL = 'https://dslmwsdbkaciwljnxxjt.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzbG13c2Ria2FjaXdsam54eGp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTMwNDY4OTMsImV4cCI6MjA2ODYyMjg5M30.q-TkknclI61oSO8VH_tR73uDC-sFuZtrI-9ZEvMeARM'

async function checkSupabase() {
  try {
    console.log('🔗 Testing Supabase connection...')
    
    // Test basic connection
    const response = await fetch(`${SUPABASE_URL}/rest/v1/users?select=count`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('❌ HTTP Error:', response.status, response.statusText)
      const errorText = await response.text()
      console.error('Error details:', errorText)
      return
    }
    
    const data = await response.json()
    console.log('✅ Supabase connection successful')
    console.log('Response:', data)
    
    // Test conversations table
    console.log('\n🔍 Testing conversations table...')
    const convResponse = await fetch(`${SUPABASE_URL}/rest/v1/conversations?select=count`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!convResponse.ok) {
      console.error('❌ Conversations table error:', convResponse.status, convResponse.statusText)
      const errorText = await convResponse.text()
      console.error('Error details:', errorText)
    } else {
      const convData = await convResponse.json()
      console.log('✅ Conversations table accessible')
      console.log('Response:', convData)
    }
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message)
  }
}

checkSupabase()