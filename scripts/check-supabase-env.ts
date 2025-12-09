import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

console.log('=== SUPABASE ENVIRONMENT CHECK ===\n');

console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Has SUPABASE_SERVICE_ROLE_KEY:', !!process.env.SUPABASE_SERVICE_ROLE_KEY);
console.log('Service Role Key length:', process.env.SUPABASE_SERVICE_ROLE_KEY?.length);
console.log('Service Role Key starts with:', process.env.SUPABASE_SERVICE_ROLE_KEY?.substring(0, 30) + '...');

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error('❌ NEXT_PUBLIC_SUPABASE_URL is not set!');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY is not set!');
}

if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.log('\n✅ Both environment variables are set');
}
