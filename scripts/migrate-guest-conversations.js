// Supabase migration: Allow guest mode conversations
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const migration = `
-- Allow NULL user_id for guest conversations
ALTER TABLE conversations
ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;

-- Create new policy for user and guest inserts
CREATE POLICY "Allow user and guest conversation inserts"
ON conversations FOR INSERT
WITH CHECK (
  user_id IS NULL OR
  auth.uid() = user_id
);
`;

async function runMigration() {
  console.log('🚀 Running Supabase migration...\n');

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: migration })
    });

    if (!response.ok) {
      // Try alternative approach using direct SQL endpoint
      console.log('Trying alternative migration approach...\n');

      const sqlResponse = await fetch(`${SUPABASE_URL}/rest/v1/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
          'Prefer': 'return=representation'
        },
        body: JSON.stringify({
          query: migration
        })
      });

      if (!sqlResponse.ok) {
        throw new Error(`Migration failed: ${sqlResponse.status} ${sqlResponse.statusText}`);
      }
    }

    console.log('✅ Migration completed successfully!\n');
    console.log('Changes:');
    console.log('  - conversations.user_id now allows NULL');
    console.log('  - Guest mode inserts are now permitted');
    console.log('  - RLS policy updated\n');

  } catch (error) {
    console.error('❌ Migration error:', error.message);
    console.log('\n⚠️  Please run this SQL manually in Supabase Dashboard:\n');
    console.log(migration);
    process.exit(1);
  }
}

runMigration();
