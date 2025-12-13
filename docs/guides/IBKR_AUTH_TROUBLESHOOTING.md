# IBKR Authentication Troubleshooting Guide

**Last Updated**: December 13, 2025
**Status**: Working - Documented for future reference

## Overview

Interactive Brokers (IBKR) Client Portal Gateway authentication can appear broken when it's actually working correctly. This guide documents the auth flow and common "false positive" issues.

## The Authentication Flow

```
1. User opens Gateway UI (https://localhost:5050)
2. User logs in with credentials
3. User completes phone 2FA (approve on phone)
4. Gateway may STILL show "not authenticated" in the UI ← THIS IS NORMAL!
5. Our API calls /iserver/auth/ssodh/init to complete the handshake
6. NOW authenticated:true is returned
```

## Key Insight (December 2025)

**The Gateway web UI doesn't always update after phone 2FA completion.** This makes it LOOK broken when it's actually working. The solution is calling the `ssodh/init` endpoint which completes the 2FA handshake server-side.

## API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/iserver/auth/status` | **GET** | Check current auth status |
| `/iserver/auth/ssodh/init` | POST | Complete 2FA handshake |
| `/iserver/reauthenticate` | POST | Force re-authentication (rarely needed) |

**IMPORTANT**: The `/iserver/auth/status` endpoint requires **GET** method. POST returns "Bad Request".

## Our Implementation (`app/api/trading/ibkr-auth/route.ts`)

```typescript
// 1. Check current status (GET method!)
let status = await makeGatewayRequest<AuthStatus>('/iserver/auth/status', 'GET')

// 2. If not authenticated, try to complete 2FA
if (!status.authenticated) {
  const initResult = await makeGatewayRequest<SsodhInitResponse>(
    '/iserver/auth/ssodh/init',
    'POST',
    JSON.stringify({ publish: true, compete: true })
  )

  // 3. If init succeeded, check status again
  if (initResult.authenticated || initResult.passed) {
    status = await makeGatewayRequest<AuthStatus>('/iserver/auth/status', 'GET')
  }
}
```

## Troubleshooting Checklist

### "IBKR auth doesn't work" - Check These First:

1. **Is Gateway running?**
   ```bash
   curl -k https://127.0.0.1:5050/v1/api/iserver/auth/status
   ```
   - If connection refused: Gateway not running. Start it.
   - If returns JSON: Gateway is running.

2. **Did you complete phone 2FA?**
   - Check your phone for IBKR notification
   - Approve the login request
   - Wait 5-10 seconds

3. **Try ssodh/init manually:**
   ```bash
   curl -k -X POST https://127.0.0.1:5050/v1/api/iserver/auth/ssodh/init \
     -H "Content-Type: application/json" \
     -d '{"publish":true,"compete":true}'
   ```
   - If `{"passed":true,"authenticated":true}`: Auth working! UI may be stale.
   - If error: User hasn't completed 2FA yet.

4. **Competing sessions?**
   - IBKR only allows ONE active session
   - Check if logged in via TWS, mobile app, or another browser
   - The `competing` flag in status indicates another session

5. **Session expired?**
   - Gateway sessions timeout after inactivity
   - Re-login through Gateway UI if needed

### Common False Positives

| Symptom | Actual Cause | Solution |
|---------|--------------|----------|
| Gateway UI shows "not authenticated" | UI didn't refresh after phone 2FA | Call ssodh/init or refresh page |
| "Bad Request" error | Using POST on auth/status | Use GET method |
| Auth works in morning, not afternoon | Session expired | Re-login |
| Works on one machine, not another | Competing session | Close other sessions |

## Testing Commands

```bash
# Check if Gateway is running and auth status
curl -k https://127.0.0.1:5050/v1/api/iserver/auth/status

# Complete 2FA handshake (after phone approval)
curl -k -X POST https://127.0.0.1:5050/v1/api/iserver/auth/ssodh/init \
  -H "Content-Type: application/json" \
  -d '{"publish":true,"compete":true}'

# Verify final status
curl -k https://127.0.0.1:5050/v1/api/iserver/auth/status
```

## Code History

**December 12, 2025** (commit 98160df):
- Changed auth/status from POST to GET (IBKR API requirement)
- Added ssodh/init call to complete 2FA handshake
- This is the CORRECT approach - previous code was hitting the wrong endpoints

**Key Learning**: The code change was an improvement, not a regression. The perceived "breakage" was due to:
1. Stale Gateway UI not reflecting actual auth state
2. Not understanding the 2FA handshake flow

## Related Files

- `app/api/trading/ibkr-auth/route.ts` - Auth API endpoint
- `components/trading/broker-status-badge.tsx` - UI status display
- `lib/trading/ibkr-client.ts` - IBKR API client (if exists)

## Environment Variables

```bash
IBKR_GATEWAY_URL=https://localhost:5050  # Gateway URL
```

---

**Bottom Line**: If IBKR auth "doesn't work", check the Gateway is running and call ssodh/init. The code is correct - the issue is usually incomplete 2FA or stale UI state.
