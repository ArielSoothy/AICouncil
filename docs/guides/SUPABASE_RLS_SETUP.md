# Supabase Row Level Security (RLS) Setup Guide

## ⚠️ Security Alert Resolution

**Issue:** Table `public.paper_trades` is public, but RLS has not been enabled.

**Risk:** Without RLS, all users can read/write to this table. This is a **critical security vulnerability** in production.

---

## 🔒 Solution: Enable RLS with Proper Policies

### Step 1: Run the RLS Migration Script

1. **Go to your Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql

2. **Open the SQL Editor** (left sidebar)

3. **Copy and paste** the entire contents of:
   ```
   scripts/enable-paper-trades-rls.sql
   ```

4. **Click "Run"** to execute the script

### Step 2: Verify RLS is Enabled

After running the script, verify it worked:

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'paper_trades';

-- Should show: rowsecurity = true
```

### Step 3: Test with Different User Roles

**A) Test as authenticated user (via frontend):**
```javascript
// This should only show the user's own trades
const { data } = await supabase.from('paper_trades').select('*');
console.log(data); // Only shows trades where user_id = current user
```

**B) Test as service role (via backend API):**
```javascript
// This should show ALL trades (backend access)
const { data } = await supabase.from('paper_trades').select('*');
console.log(data); // Shows all trades (service role bypasses RLS)
```

---

## 📋 What the Script Does

### 1. Adds `user_id` Column
```sql
ALTER TABLE public.paper_trades
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
```
- Links trades to users
- Nullable (supports existing records)
- Cascading delete (removes trades when user deleted)

### 2. Enables RLS
```sql
ALTER TABLE public.paper_trades ENABLE ROW LEVEL SECURITY;
```
- Activates row-level security enforcement
- Policies will control access

### 3. Creates 6 Security Policies

| Policy | Purpose | Who |
|--------|---------|-----|
| **Users can view their own trades** | SELECT | Authenticated users (own data) |
| **Users can insert their own trades** | INSERT | Authenticated users (own data) |
| **Users can update their own trades** | UPDATE | Authenticated users (own data) |
| **Users can delete their own trades** | DELETE | Authenticated users (own data) |
| **Service role has full access** | ALL | Backend API (service_role) |
| **Allow anonymous read for demo** | SELECT | Public (NULL user_id only) |

---

## 🔑 Environment Variables Required

Make sure these are set in your Vercel/production environment:

```bash
# Public (frontend)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-anon-key

# Private (backend only!)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...your-service-role-key
```

**⚠️ CRITICAL:** Never expose `SUPABASE_SERVICE_ROLE_KEY` to the frontend!

---

## 🧪 Testing the RLS Policies

### Test 1: Create a Test User

```sql
-- In Supabase Dashboard → Authentication → Users
-- Click "Add user" → Create test user
```

### Test 2: Insert a Trade for Test User

```sql
INSERT INTO public.paper_trades (
  user_id,
  mode,
  symbol,
  action,
  quantity,
  price,
  confidence
) VALUES (
  'YOUR_TEST_USER_UUID', -- Replace with actual user UUID
  'consensus',
  'AAPL',
  'BUY',
  10,
  150.00,
  0.85
);
```

### Test 3: Query as Different Users

```sql
-- Set current user (simulates frontend)
SET request.jwt.claim.sub = 'YOUR_TEST_USER_UUID';

-- Should only return trades for this user
SELECT * FROM public.paper_trades;
```

---

## 🐛 Troubleshooting

### Issue: "Permission denied for table paper_trades"

**Cause:** RLS is enabled but no policies match

**Fix:** Run the `enable-paper-trades-rls.sql` script again

### Issue: "Column user_id does not exist"

**Cause:** Migration not run yet

**Fix:** Run the RLS migration script

### Issue: Users can see all trades (not just their own)

**Cause:** Using service role key on frontend (NEVER do this!)

**Fix:** Use `NEXT_PUBLIC_SUPABASE_ANON_KEY` on frontend

### Issue: Backend API can't insert trades

**Cause:** Not passing `userId` to `saveTrade()` function

**Fix:** Update API calls to include user ID:
```typescript
await saveTrade(
  mode,
  symbol,
  action,
  quantity,
  price,
  reasoning,
  confidence,
  alpacaOrderId,
  user.id // ← Add this!
);
```

---

## 📦 Code Changes Required

### Update API Routes

Any API route that calls `saveTrade()` needs to pass the user ID:

```typescript
// app/api/trading/execute/route.ts (example)
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // ... trading logic ...

  // Pass user.id to saveTrade
  await saveTrade(
    mode,
    symbol,
    action,
    quantity,
    price,
    reasoning,
    confidence,
    alpacaOrderId,
    user.id // ← Pass the authenticated user's ID
  );
}
```

---

## ✅ Verification Checklist

After applying the fix, verify:

- [ ] RLS is enabled: `SELECT rowsecurity FROM pg_tables WHERE tablename = 'paper_trades';` returns `true`
- [ ] 6 policies created: Check Supabase Dashboard → Authentication → Policies
- [ ] `user_id` column exists: `\d paper_trades` shows `user_id` field
- [ ] Index created: `idx_paper_trades_user_id` exists
- [ ] Security alert resolved in Supabase Dashboard
- [ ] Frontend users can only see their own trades
- [ ] Backend API can insert trades with user_id
- [ ] No TypeScript errors after code updates

---

## 🎯 Benefits of RLS

1. **Data Isolation:** Users can only access their own data
2. **No Backend Logic:** Security enforced at database level
3. **Zero Trust:** Even if API is compromised, users can't access others' data
4. **Audit Trail:** `user_id` tracks who created each trade
5. **Compliance:** Meets data privacy requirements (GDPR, CCPA)

---

## 📚 Further Reading

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- [PostgreSQL Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers)

---

**Last Updated:** December 2025
**Status:** Ready for production deployment
