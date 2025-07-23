const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

console.log('Checking Supabase connection...')
console.log('URL:', supabaseUrl)
console.log('Key exists:', !!supabaseKey)

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkConnection() {
  try {
    // Test basic connection
    console.log('\n1. Testing basic connection...')
    const { data, error } = await supabase.from('users').select('count', { count: 'exact' })
    
    if (error) {
      console.error('❌ Connection failed:', error.message)
      return
    }
    
    console.log('✅ Connected successfully')
    console.log('Users table exists with', data?.length || 0, 'records')
    
    // Test conversations table
    console.log('\n2. Testing conversations table...')
    const { data: convData, error: convError } = await supabase
      .from('conversations')
      .select('count', { count: 'exact' })
    
    if (convError) {
      console.error('❌ Conversations table error:', convError.message)
    } else {
      console.log('✅ Conversations table exists with', convData?.length || 0, 'records')
    }
    
  } catch (err) {
    console.error('❌ Unexpected error:', err.message)
  }
}

checkConnection()