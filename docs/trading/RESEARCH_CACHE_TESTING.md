# Research Cache Testing Guide

**Purpose**: Test the new research caching system to verify 45% cost savings and 2x faster responses

**Status**: Phase 1 implementation complete, ready for testing

---

## Prerequisites

### 1. Run Database Migration

**IMPORTANT: You must run this SQL script first in Supabase Dashboard**

1. Go to Supabase Dashboard: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click "SQL Editor" in the left sidebar
3. Open the SQL file: `/scripts/create-research-cache-table.sql`
4. Copy entire contents and paste into SQL Editor
5. Click "Run" button
6. Verify success message: "research_cache table created successfully!"

**What the script does:**
- Creates `research_cache` table with all necessary columns
- Sets up indexes for fast lookups
- Configures Row Level Security (RLS) policies
- Creates cache statistics functions
- Sets up automatic cleanup triggers

### 2. Verify Environment Variables

Ensure these are set in your `.env.local`:
```bash
NEXT_PUBLIC_SUPABASE_URL=<your_supabase_url>
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

---

## Testing Plan

### Test 1: Cache Miss (First Query)

**Objective**: Verify fresh research runs and gets cached

**Steps:**
1. Navigate to http://localhost:3000/trading
2. Select "Consensus Trade" mode
3. Select Pro preset (8 models)
4. Enter stock symbol: **TSLA**
5. Select timeframe: **swing**
6. Click "Get Trading Decision"

**Expected Results:**
```
Server Console Output:
🔬 PHASE 1: Fetching research for TSLA...
💨 Cache miss - running fresh research pipeline...
🔍 Technical Analyst starting research...
🏢 Fundamental Analyst starting research...
🎭 Sentiment Analyst starting research...
⚠️ Risk Manager starting research...
✅ Research complete: 35 tools used, 9.2s duration
💾 Research cached for future queries

🔬 PHASE 2: Decision models analyzing research findings...
```

**Verify:**
- ✅ "Cache miss" message appears
- ✅ 30-40 tool calls executed
- ✅ ~8-12 seconds research duration
- ✅ "Research cached" message appears
- ✅ Trading decisions appear correctly

---

### Test 2: Cache Hit (Repeat Query)

**Objective**: Verify cached research is reused (NO API calls)

**Steps:**
1. Stay on same page (or refresh)
2. Enter same stock symbol: **TSLA**
3. Same timeframe: **swing**
4. Click "Get Trading Decision" again

**Expected Results:**
```
Server Console Output:
🔬 PHASE 1: Fetching research for TSLA...
✅ Using cached research (saved 30-40 API calls!)
📊 Cached research stats: 35 tools used, 9.2s original duration

🔬 PHASE 2: Decision models analyzing research findings...
```

**Verify:**
- ✅ "Using cached research" message appears
- ✅ NO tool calls executed (saved 30-40 calls!)
- ✅ Research phase completes instantly (<0.5s)
- ✅ Same trading decisions appear
- ✅ Response time 2x faster

---

### Test 3: Different Timeframe = Different Cache

**Objective**: Verify cache keys work correctly (symbol + timeframe)

**Steps:**
1. Same stock: **TSLA**
2. Different timeframe: **day** (not swing)
3. Click "Get Trading Decision"

**Expected Results:**
```
Server Console Output:
🔬 PHASE 1: Fetching research for TSLA...
💨 Cache miss - running fresh research pipeline...
(New research runs)
💾 Research cached for future queries
```

**Verify:**
- ✅ Cache miss (different cache key)
- ✅ New research runs
- ✅ Gets cached separately

---

### Test 4: Different Symbol = Different Cache

**Objective**: Verify symbol-based cache isolation

**Steps:**
1. Different stock: **AAPL**
2. Same timeframe: **swing**
3. Click "Get Trading Decision"

**Expected Results:**
```
Server Console Output:
🔬 PHASE 1: Fetching research for AAPL...
💨 Cache miss - running fresh research pipeline...
(New research runs)
💾 Research cached for future queries
```

**Verify:**
- ✅ Cache miss (different symbol)
- ✅ AAPL research runs fresh
- ✅ Gets cached separately from TSLA

---

### Test 5: Cache Expiration (TTL Test)

**Objective**: Verify cache expires after TTL

**TTL Values:**
- Day trading: 15 minutes
- Swing trading: 1 hour
- Position trading: 4 hours
- Long-term: 24 hours

**Steps:**
1. Query **NVDA** with **day** timeframe
2. Wait 16 minutes ⏳
3. Query **NVDA** with **day** timeframe again

**Expected Results:**
```
Server Console Output:
⏰ Cache expired: NVDA-day (expired 1min ago)
💨 Cache miss - running fresh research pipeline...
(New research runs)
```

**Verify:**
- ✅ Cache expired after 15min TTL
- ✅ Fresh research runs
- ✅ New research gets cached

**Note:** For quick testing, you can modify `CACHE_TTL` in `/lib/trading/research-cache.ts` temporarily:
```typescript
day: 60 * 1000, // 1 minute (for testing)
```

---

### Test 6: Cache Statistics

**Objective**: Verify cache monitoring functions

**Steps:**
1. Run SQL query in Supabase SQL Editor:
```sql
SELECT * FROM get_research_cache_stats();
```

**Expected Results:**
```
total_entries | active_entries | expired_entries | most_cached_symbols  | avg_access_count | cache_age_hours
--------------|----------------|-----------------|---------------------|------------------|----------------
4             | 4              | 0               | {TSLA,AAPL,NVDA,MSFT} | 2.5              | 0.25
```

**Verify:**
- ✅ Correct count of cached entries
- ✅ Symbols appear in array
- ✅ Access counts track properly
- ✅ Cache age calculated correctly

---

### Test 7: Manual Cache Invalidation

**Objective**: Verify manual cache clearing works

**Steps:**
1. In Node/API console, run:
```typescript
const { ResearchCache } = require('@/lib/trading/research-cache');
const cache = new ResearchCache();

// Invalidate specific symbol+timeframe
await cache.invalidate('TSLA', 'swing', 'Testing manual invalidation');

// Or invalidate all timeframes for symbol
await cache.invalidate('TSLA', undefined, 'Major news event');
```

2. Query **TSLA** with **swing** again

**Expected Results:**
```
Server Console Output:
🔬 PHASE 1: Fetching research for TSLA...
⚠️  Cache invalidated: TSLA-swing (Testing manual invalidation)
💨 Cache miss - running fresh research pipeline...
```

**Verify:**
- ✅ Invalidation message appears
- ✅ Fresh research runs
- ✅ Reason logged correctly

---

## Success Metrics

After testing, verify these metrics:

### Performance Metrics:
- ✅ **Cache Hit Response Time**: <2s (vs 8-12s without cache)
- ✅ **API Call Reduction**: 0 calls vs 30-40 calls (100% savings on cache hit)
- ✅ **Cost Savings**: $0 vs ~$0.003 per research (100% savings on cache hit)

### Functionality Metrics:
- ✅ Cache hits work correctly (no research runs)
- ✅ Cache misses trigger fresh research
- ✅ Different symbols cached separately
- ✅ Different timeframes cached separately
- ✅ TTL expiration working correctly
- ✅ Manual invalidation working
- ✅ Statistics functions working

### Expected Cache Hit Rate:
- **Week 1**: 20-30% (users exploring different stocks)
- **Week 2**: 40-50% (users revisiting popular stocks)
- **Week 3+**: 50-60% (mature cache with popular stocks)

**Target**: 40%+ cache hit rate after 1 week

---

## Database Verification

### Check Cache Table Directly:

```sql
-- View all cached research
SELECT
  symbol,
  timeframe,
  total_tool_calls,
  cached_at,
  expires_at,
  access_count,
  is_stale
FROM research_cache
ORDER BY cached_at DESC;

-- Check active vs expired
SELECT
  COUNT(*) FILTER (WHERE expires_at > NOW()) as active,
  COUNT(*) FILTER (WHERE expires_at <= NOW()) as expired
FROM research_cache;

-- Most accessed stocks
SELECT
  symbol,
  SUM(access_count) as total_accesses,
  COUNT(*) as cache_entries
FROM research_cache
GROUP BY symbol
ORDER BY total_accesses DESC;
```

---

## Troubleshooting

### Issue: "Cache get error" in console
**Solution**: Verify Supabase credentials in `.env.local`

### Issue: Research always runs fresh (no cache hits)
**Solution**:
1. Check if SQL script was run successfully
2. Verify RLS policies are active
3. Check cache TTL hasn't expired

### Issue: TypeScript errors about ResearchCache
**Solution**: Run `npm run type-check` to verify clean compilation

### Issue: Cache not saving
**Solution**:
1. Check SUPABASE_SERVICE_ROLE_KEY is set
2. Verify RLS policies allow INSERT for authenticated users
3. Check console for "Cache write error" messages

---

## Expected Cost Savings

### Without Cache (Every Query):
- 30-40 API calls per research
- ~$0.003 per research
- 100 analyses/day = $0.30/day = $9/month

### With Cache (40% hit rate):
- 60 fresh research × $0.003 = $0.18
- 40 cached (free) = $0.00
- Total: $0.18/day = $5.40/month

**Savings: 40% cost reduction + 2x faster responses**

---

## Next Steps After Testing

If cache hit rate >40% after 1 week:

1. **Phase 2**: Extend caching to Individual/Debate modes
2. **Phase 3**: Implement incremental updates (quote/news only)
3. **Monitoring**: Set up Supabase dashboard for cache analytics
4. **Optimization**: Tune TTL values based on real usage patterns

If cache hit rate <20% after 1 week:
- Analyze which symbols/timeframes are most queried
- Consider increasing TTL for popular stocks
- Evaluate if incremental updates would help
