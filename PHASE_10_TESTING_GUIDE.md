# Phase 10: Production Testing & Deployment Guide

**Status**: Ready for User Testing
**Date**: January 3, 2026
**Architecture**: Database-Backed (Gemini AI Recommended)

---

## 🎯 Overview

Phase 10 involves testing the complete pre-market screening system end-to-end with **real TWS Desktop data**. All components are built and ready - this phase is about validation and deployment.

---

## ✅ Pre-Test Checklist

Before starting, ensure you have:

- [ ] **TWS Desktop or IB Gateway** installed
- [ ] **Paper trading account** (or live if you prefer)
- [ ] **API enabled** in TWS settings (File → Global Configuration → API → Settings)
- [ ] **Python 3.8+** installed
- [ ] **Node.js 18+** installed
- [ ] **Supabase account** with `screening_results` table created
- [ ] **Environment variables** configured in `.env.local`

---

## 🚀 Quick Start Testing (5 Minutes)

### Step 1: Start TWS Desktop (Terminal 1)

```bash
# Launch TWS Desktop or IB Gateway
# Login to your paper trading account
# Ensure API is enabled on port 7496 (paper) or 4001 (live)
```

**Verify TWS is ready**:
- API settings show "Enable ActiveX and Socket Clients" is checked
- Port 7496 (paper) or 4001 (live) is configured
- No other applications connected (or use unique client ID)

### Step 2: Start FastAPI Server (Terminal 2)

```bash
cd /Users/user/AI-Counsil/AICouncil

# Activate Python environment (if using venv)
# source venv/bin/activate

# Start FastAPI on port 8001
uvicorn api.main:app --host 127.0.0.1 --port 8001 --reload
```

**Expected output**:
```
INFO:     Started server process [PID]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://127.0.0.1:8001
```

**Verify health**:
```bash
curl http://localhost:8001/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "version": "2.0.0",
  "timestamp": "2026-01-03T...",
  "tws_connected": true
}
```

### Step 3: Run Orchestrator (Terminal 3)

```bash
cd /Users/user/AI-Counsil/AICouncil

# Run the screening orchestrator
python -m lib.trading.screening.screening_orchestrator
```

**What to expect**:
```
[INFO] Connecting to TWS on 127.0.0.1:7496 (Client ID: 20)...
[SUCCESS] ✅ Connected to TWS

======================================================================
PHASE 1: TWS Market Scanner (Finding Pre-Market Gappers)
======================================================================
[INFO] Requesting scanner data...
[SUCCESS] ✅ Scanner found 5 stocks

======================================================================
PHASE 2: TWS Fundamentals
======================================================================
[INFO] Requesting fundamentals for AAPL...
[SUCCESS] ✅ Fundamentals: P/E 28.5, Market Cap $2.5T

... (continues through all 6 phases)

======================================================================
RESULTS SUMMARY
======================================================================
Total stocks scanned: 5
Stocks with complete data: 3
Execution time: 10.2 seconds

Top 3 Stocks by Score:
  1. AAPL - Score: 85.5, Gap: +5.25%
  2. TSLA - Score: 78.2, Gap: +4.1%
  3. NVDA - Score: 72.8, Gap: +3.5%

[SUCCESS] ✅ Saved to database (ID: 7b4e1c72-...)
```

**If you see errors**:
- **Client ID in use**: Change `client_id=20` to `client_id=25` in `screening_orchestrator.py`
- **Connection refused**: Verify TWS Desktop is running and API is enabled
- **No scanner results**: Market may be closed or no stocks meeting criteria

### Step 4: Verify Database Write

```bash
# Check latest screening in database
curl http://localhost:8001/api/screening/latest | jq
```

Expected response:
```json
{
  "stocks": [
    {
      "symbol": "AAPL",
      "rank": 0,
      "gap_percent": 5.25,
      "score": 85.5,
      ...
    }
  ],
  "total_scanned": 5,
  "total_returned": 3,
  "execution_time_seconds": 10.2,
  "timestamp": "2026-01-03T..."
}
```

### Step 5: Start Next.js Frontend (Terminal 4)

```bash
cd /Users/user/AI-Counsil/AICouncil

# Start development server
npm run dev
```

**Access the screening page**:
1. Open browser: `http://localhost:3000`
2. Click "Screening" in header navigation
3. Or direct: `http://localhost:3000/trading/screening`

**What you should see**:
- ✅ Stats summary with real numbers from TWS
- ✅ Stock cards showing real pre-market data
- ✅ Scores, gaps, fundamentals, sentiment all populated
- ✅ Auto-refresh toggle working
- ✅ Manual refresh button working

---

## 🧪 Detailed Testing Scenarios

### Test 1: Basic Data Flow (10 minutes)

**Goal**: Verify data flows from TWS → Database → FastAPI → Next.js

**Steps**:
1. Run orchestrator (Terminal 3)
2. Check database has new record: `curl http://localhost:8001/api/screening/latest`
3. Refresh browser page: `http://localhost:3000/trading/screening`
4. Verify stock data matches orchestrator output

**Success Criteria**:
- [ ] Orchestrator completes without errors
- [ ] Database receives new screening record
- [ ] FastAPI returns data < 100ms
- [ ] Next.js displays data correctly
- [ ] All 6 data sources populated (scanner, fundamentals, short data, ratios, bars, sentiment)

### Test 2: Auto-Refresh (5 minutes)

**Goal**: Verify frontend auto-refreshes every 5 minutes

**Steps**:
1. Open screening page in browser
2. Enable "Auto-refresh (5min)" checkbox
3. Run orchestrator again to create new data
4. Wait 5 minutes (or modify interval to 30 seconds for testing)
5. Verify page refreshes automatically

**Success Criteria**:
- [ ] Auto-refresh checkbox works
- [ ] Page fetches new data after interval
- [ ] Timestamp updates to show latest data
- [ ] No page reload, just data update

**Optional: Speed up for testing**:
```typescript
// In components/trading/PreMarketScreening.tsx, line 80
// Change from 5 minutes to 30 seconds:
const interval = setInterval(fetchScreening, 30 * 1000) // 30 seconds
```

### Test 3: Pre-Market Hours (Real-World Test)

**Goal**: Run during actual pre-market hours (4:00-9:30am ET)

**Best Time**: 8:00-9:00am ET (high activity before market open)

**Steps**:
1. Set cron job to run at 8:00am ET:
   ```bash
   # Edit crontab
   crontab -e

   # Add this line (runs at 8:00am, 8:15am, 8:30am, etc.)
   0,15,30,45 8-9 * * 1-5 /Users/user/AI-Counsil/AICouncil/scripts/run-screening-cron.sh
   ```
2. Wake up at 8:00am ET (or schedule to run automatically)
3. Check `logs/screening-YYYYMMDD.log` for results
4. View results in browser: `http://localhost:3000/trading/screening`

**Success Criteria**:
- [ ] Cron job runs automatically
- [ ] Orchestrator finds real pre-market gappers
- [ ] Data is fresh (< 15 minutes old)
- [ ] Scores reflect actual trading opportunities

### Test 4: Error Handling

**Goal**: Verify system handles failures gracefully

**Test 4a: TWS Disconnected**
```bash
# Stop TWS Desktop
# Run orchestrator
python -m lib.trading.screening.screening_orchestrator
```

**Expected**: Error message, no database write, FastAPI still serves old data

**Test 4b: Database Unavailable**
```bash
# Temporarily break Supabase URL in .env.local
# Run orchestrator
```

**Expected**: Warning about database write failure, orchestrator still completes

**Test 4c: FastAPI Down**
```bash
# Stop FastAPI server
# Refresh browser page
```

**Expected**: Error message in UI: "Make sure FastAPI server is running on http://localhost:8001"

**Test 4d: No Stocks Found**
```bash
# Run orchestrator when market is closed or no gappers exist
```

**Expected**: "No screening results found. Run the orchestrator during pre-market hours (4:00-9:30am ET)."

---

## 📊 Performance Benchmarks

After testing, verify performance meets targets:

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Orchestrator execution | < 15s | ___ s | ☐ |
| Database write | < 1s | ___ ms | ☐ |
| Database read | < 100ms | ___ ms | ☐ |
| FastAPI `/latest` | < 100ms | ___ ms | ☐ |
| Next.js page load | < 2s | ___ s | ☐ |
| Auto-refresh overhead | Negligible | ___ | ☐ |

**How to measure**:
```bash
# Orchestrator
time python -m lib.trading.screening.screening_orchestrator

# FastAPI
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:8001/api/screening/latest

# Create curl-format.txt:
echo "time_total: %{time_total}s\n" > curl-format.txt
```

---

## 🚀 Production Deployment

Once testing is complete and performance is validated:

### Step 1: Deploy FastAPI

**Option A: Railway.app (Recommended)**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project
railway init

# Deploy
railway up

# Set environment variables in Railway dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - FINNHUB_API_KEY (optional)
```

**Option B: DigitalOcean App Platform**
1. Connect GitHub repository
2. Configure build: `pip install -r requirements.txt`
3. Configure run: `uvicorn api.main:app --host 0.0.0.0 --port $PORT`
4. Set environment variables

### Step 2: Deploy Next.js to Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel

# Set environment variables in Vercel dashboard:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - NEXT_PUBLIC_FASTAPI_URL (production FastAPI URL from Railway/DO)
```

### Step 3: Set Up Production Cron

**Option A: Local Cron (if running on always-on server)**
```bash
# Edit crontab
crontab -e

# Add production schedule (every 15 min during pre-market, Mon-Fri, 4:00-9:30am ET)
0,15,30,45 4-9 * * 1-5 /path/to/run-screening-cron.sh
```

**Option B: Cloud Scheduler**
- AWS EventBridge + Lambda
- Google Cloud Scheduler + Cloud Run
- Azure Logic Apps

**⚠️ Important**: Production cron requires TWS Desktop or IBKR Gateway running 24/7. Consider:
- Dedicated server/VPS with TWS Desktop
- Cloud instance (AWS EC2, DigitalOcean Droplet) with TWS
- Or run orchestrator manually before market open

---

## 🐛 Common Issues & Fixes

### Issue 1: "Client ID already in use"

**Solution**:
```python
# In lib/trading/screening/screening_orchestrator.py
# Change client_id from 20 to 25 or 30
client_id: int = 30  # Use unique client ID
```

### Issue 2: "Connection refused" to TWS

**Solution**:
1. Verify TWS Desktop is running
2. Check API settings: File → Global Configuration → API → Settings
3. Ensure "Enable ActiveX and Socket Clients" is checked
4. Verify port 7496 (paper) or 4001 (live)
5. Check firewall settings

### Issue 3: Scanner returns 0 stocks

**Causes**:
- Market is closed
- No stocks meeting gap criteria (min 3%)
- Scanner subscription not active on IBKR account

**Solution**:
- Run during pre-market hours (4:00-9:30am ET)
- Lower min_gap_percent in orchestrator: `min_gap_percent=1.0`
- Verify IBKR account has market data subscriptions

### Issue 4: Sentiment data missing

**Cause**: No FINNHUB_API_KEY or free tier limit reached

**Solution**:
1. Get free API key: https://finnhub.io
2. Add to `.env.local`: `FINNHUB_API_KEY=your_key_here`
3. Or disable sentiment: `include_sentiment=False` in orchestrator

### Issue 5: Database write fails

**Cause**: RLS policy or Supabase credentials

**Solution**:
```bash
# Test Supabase connection
python scripts/test-database-flow.py

# If fails, check:
# 1. NEXT_PUBLIC_SUPABASE_URL in .env.local
# 2. NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
# 3. RLS policy allows inserts (see scripts/create-screening-results-table.sql)
```

---

## 📝 Testing Checklist

Before marking Phase 10 complete:

- [ ] **Database Layer**
  - [ ] Orchestrator writes to Supabase successfully
  - [ ] FastAPI reads from Supabase < 100ms
  - [ ] Historical queries work (pagination)
  - [ ] RLS policies tested (read/write permissions)

- [ ] **Data Quality**
  - [ ] All 6 data sources populated (scanner, fundamentals, short data, ratios, bars, sentiment)
  - [ ] Composite scores accurate (0-100 range)
  - [ ] Gap percentages correct
  - [ ] Volume data present

- [ ] **Performance**
  - [ ] Orchestrator completes < 15 seconds
  - [ ] API responses < 100ms
  - [ ] Frontend loads < 2 seconds
  - [ ] No memory leaks during auto-refresh

- [ ] **Error Handling**
  - [ ] TWS disconnection handled gracefully
  - [ ] Database errors logged, don't crash
  - [ ] Frontend shows clear error messages
  - [ ] Missing data fields handled (optional fields)

- [ ] **Frontend**
  - [ ] Stats dashboard displays correctly
  - [ ] Stock cards show all data
  - [ ] Score color-coding works (green/yellow/red)
  - [ ] Auto-refresh working
  - [ ] Manual refresh working
  - [ ] Mobile responsive
  - [ ] Dark mode compatible

- [ ] **Production Readiness**
  - [ ] Documentation complete
  - [ ] Environment variables documented
  - [ ] Cron job tested (if using)
  - [ ] Logs rotating properly
  - [ ] TypeScript 0 errors

---

## 🎓 Success Criteria

Phase 10 is complete when:

1. ✅ Orchestrator runs successfully with real TWS Desktop data
2. ✅ All 6 data sources populate correctly
3. ✅ Database writes and reads working flawlessly
4. ✅ FastAPI endpoints responding < 100ms
5. ✅ Next.js frontend displays live pre-market data
6. ✅ Auto-refresh working reliably
7. ✅ Cron job scheduled (optional, but recommended)
8. ✅ All error cases tested and handled
9. ✅ Performance benchmarks met
10. ✅ Ready for real pre-market trading use

---

## 📚 Additional Resources

- **Architecture**: `docs/trading/DATABASE_BACKED_ARCHITECTURE.md`
- **Integration**: `docs/trading/SCREENING_INTEGRATION.md`
- **Testing Summary**: `TESTING_SUMMARY.md`
- **Test Results**: `TEST_RESULTS.md`
- **Feature Docs**: `docs/trading/TRADING_SYSTEM.md` (Feature #55)

---

## 🚀 Next Steps After Phase 10

Once Phase 10 testing is complete:

1. **Phase 11**: Real trading integration (execute trades based on screening results)
2. **Phase 12**: Machine learning scoring (train model on historical screening + outcomes)
3. **Phase 13**: Alert system (push notifications for high-score opportunities)
4. **Phase 14**: Backtesting (validate scoring algorithm against historical data)

---

*Last Updated: January 3, 2026*
*Status: Ready for User Testing*
*Estimated Testing Time: 30-60 minutes*
*Best Time to Test: Pre-market hours (4:00-9:30am ET, Mon-Fri)*
