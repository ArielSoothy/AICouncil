# Database Setup Instructions

The Supabase database is connected but needs to be properly configured. Here's what you need to do:

## 1. Run the Database Schema

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project: `dslmwsdbkaciwljnxxjt`
3. Go to **SQL Editor**
4. Copy and paste the entire contents of `supabase-schema.sql` 
5. Click **Run** to execute all the SQL commands

This will create:
- ✅ `users` table with RLS policies
- ✅ `conversations` table with RLS policies  
- ✅ `feedback` table with RLS policies
- ✅ Proper indexes and triggers
- ✅ Auto-user creation function

## 2. Verify Tables Were Created

After running the schema, verify in **Table Editor**:
- `users` table should exist
- `conversations` table should exist  
- `feedback` table should exist

## 3. Test Authentication

Once the schema is set up:
1. Start the dev server: `npm run dev`
2. Navigate to `/debug-auth`
3. Test the authentication APIs

## 4. Common Issues

**"authentication error"** usually means:
- User exists in `auth.users` but not in `public.users`
- RLS policies are blocking access
- Missing environment variables

**"unauthorized"** usually means:
- No active session
- Cookies not being sent properly
- User not authenticated

The schema includes an auto-trigger that should create a `public.users` record whenever someone signs up, but if you created test users before running the schema, they won't be in the `public.users` table.

## 5. Manual User Creation (if needed)

If your test user still doesn't work after running the schema, you can manually add them:

```sql
-- Replace with your test user's actual ID from auth.users
INSERT INTO public.users (id, email) 
SELECT id, email FROM auth.users 
WHERE email = 'your-test-email@example.com';
```

Run this in the SQL Editor if needed.