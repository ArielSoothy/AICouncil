# Vercel Cron Setup for Arena Mode

**Created**: October 24, 2025
**Purpose**: Automated autonomous trading runs for Arena Mode

---

## Overview

Arena Mode uses Vercel Cron to execute autonomous trading runs on a schedule. AI models compete automatically without manual intervention.

---

## Configuration

### Cron Schedule (vercel.json)

```json
{
  "crons": [
    {
      "path": "/api/arena/cron",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Current Schedule**: Daily at 9:00 AM UTC
**Cron Format**: `minute hour day month dayOfWeek`

### Alternative Schedules

```bash
# Hourly (every hour at minute 0)
"0 * * * *"

# Every 4 hours
"0 */4 * * *"

# Daily at 9 AM UTC
"0 9 * * *"

# Monday-Friday at 9 AM UTC (weekdays only)
"0 9 * * 1-5"

# Every weekday at 9 AM and 5 PM UTC
"0 9,17 * * 1-5"
```

---

## Environment Variables

### Required: CRON_SECRET

Add to Vercel environment variables for security:

```bash
CRON_SECRET=your-random-secret-here
```

**How to set:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `CRON_SECRET` with a random secure value
3. Generate secure value: `openssl rand -base64 32`
4. Example: `CRON_SECRET=abc123xyz789randomsecretvalue`

**Purpose**: Prevents unauthorized cron endpoint access

---

## How It Works

### Execution Flow

```
1. Vercel Cron Trigger (scheduled time)
   ↓
2. GET /api/arena/cron (with Bearer token)
   ↓
3. Verify CRON_SECRET authentication
   ↓
4. Check arena_config.is_enabled = true
   ↓
5. Call POST /api/arena/execute internally
   ↓
6. Execute trading for all enabled models
   ↓
7. Save trades to arena_trades table
   ↓
8. Auto-update model_performance via trigger
   ↓
9. Update arena_runs with results
```

### API Endpoint

**GET** `/api/arena/cron`

**Headers**:
```
Authorization: Bearer {CRON_SECRET}
```

**Response** (Success):
```json
{
  "success": true,
  "timestamp": "2025-10-24T09:00:00.000Z",
  "result": {
    "runId": "uuid",
    "tradesExecuted": 3,
    "totalModels": 3
  }
}
```

**Response** (Disabled):
```json
{
  "message": "Arena Mode is disabled",
  "skipped": true
}
```

---

## Enable/Disable Arena Mode

### Via Database (Recommended)

```sql
-- Enable Arena Mode
UPDATE arena_config
SET is_enabled = true
WHERE id = 1;

-- Disable Arena Mode
UPDATE arena_config
SET is_enabled = false
WHERE id = 1;
```

### Via API

**POST** `/api/arena/config`

```json
{
  "is_enabled": true
}
```

---

## Testing Cron Locally

### Method 1: Direct Endpoint Call

```bash
# Set CRON_SECRET in .env.local
CRON_SECRET=your-test-secret

# Call cron endpoint
curl -H "Authorization: Bearer your-test-secret" \
  http://localhost:3000/api/arena/cron
```

### Method 2: Manual Execution

Use the "Run Now" button in Arena Mode UI at `/arena`

---

## Monitoring

### Check Cron Logs

1. Vercel Dashboard → Your Project → Deployments
2. Select latest deployment → Functions
3. Filter by `/api/arena/cron`
4. View execution logs and errors

### Database Queries

```sql
-- Check recent arena runs
SELECT * FROM arena_runs
ORDER BY started_at DESC
LIMIT 10;

-- Check last cron execution
SELECT last_run_at, next_run_at
FROM arena_config
WHERE id = 1;

-- Check recent trades
SELECT * FROM arena_trades
ORDER BY created_at DESC
LIMIT 20;
```

---

## Production Deployment

### Checklist

- [ ] Set `CRON_SECRET` in Vercel environment variables
- [ ] Deploy to Vercel (cron auto-enabled for production)
- [ ] Enable Arena Mode: `UPDATE arena_config SET is_enabled = true`
- [ ] Configure enabled models in `arena_config.enabled_models`
- [ ] Set safety limits (`max_position_size`, `max_daily_loss`)
- [ ] Monitor first few runs for errors
- [ ] Verify `model_performance` table updates correctly

---

## Troubleshooting

### Cron Not Executing

**Issue**: Cron job not running
**Solution**:
- Verify `vercel.json` cron configuration is deployed
- Check Vercel Dashboard → Cron Jobs for status
- Cron only works in production (not preview/development)

### Authentication Errors

**Issue**: 401 Unauthorized
**Solution**:
- Verify `CRON_SECRET` environment variable is set
- Ensure cron sends `Authorization: Bearer {secret}` header
- Vercel automatically adds auth header for configured crons

### Arena Mode Disabled

**Issue**: Cron runs but skips execution
**Solution**:
- Check `arena_config.is_enabled = true`
- Verify enabled_models array is not empty
- Check Supabase logs for config fetch errors

### Execution Timeout

**Issue**: Function timeout before completion
**Solution**:
- Increase `maxDuration` in `vercel.json` (currently 60s)
- Reduce number of enabled models
- Optimize model query concurrency

---

## Cost Considerations

### Vercel Cron Pricing

- **Hobby Plan**: 1 cron job (free)
- **Pro Plan**: Unlimited cron jobs ($20/month)

### Execution Costs

- **Daily runs**: ~30 function invocations/month
- **Hourly runs**: ~720 function invocations/month
- Each run queries 3-10 AI models (depends on config)

### Recommended for MVP

- Start with **daily runs** at low-traffic time
- Monitor model API costs
- Free tier AI models: Gemini Flash, Llama (Groq)
- Upgrade to hourly after cost validation

---

## Next Steps

1. Deploy to Vercel production
2. Set `CRON_SECRET` environment variable
3. Enable Arena Mode in database
4. Monitor first 3-5 automated runs
5. Adjust schedule based on performance
6. Add alerting for failures (future)

---

**Status**: Cron configuration complete, ready for production deployment
