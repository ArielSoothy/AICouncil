# TWS API Migration Plan - Pre-Market Stock Screening

**Date**: January 3, 2026
**Decision**: Option A - Migrate to TWS API (ib_insync)
**Timeline**: 2 weeks to production-ready
**Goal**: Get 90% of data from TWS API + 10% from Finnhub

---

## 🎯 Migration Goals

### Primary Objectives
1. **Comprehensive Data Coverage**: 90% from TWS API (fundamentals, short data, ratios, scanners)
2. **Single Source of Truth**: IBKR as primary data provider
3. **Short Selling Data**: Critical field 7636 via tick 236
4. **Fundamental Ratios**: 60+ ratios via tick 258
5. **Social Sentiment**: Finnhub free tier for what TWS doesn't have

### Success Metrics
- ✅ Can scan pre-market gappers (4am-9:30am ET)
- ✅ Get P/E, EPS, Market Cap for each stock
- ✅ Get shortable shares count (critical!)
- ✅ Get 60+ fundamental ratios
- ✅ Get social sentiment scores
- ✅ Complete screening in <30 seconds for 20 stocks

---

## 🏗️ Architecture Overview

### Current Architecture (Client Portal)
```
Next.js App (TypeScript)
  ↓ HTTPS REST
IBKR Gateway (localhost:5050)
  ↓
IBKR Client Portal API
  ↓
❌ Returns 0 fields for fundamentals/short data
```

### New Architecture (TWS API)
```
Next.js App (TypeScript)
  ↓ HTTP REST
FastAPI Python Server (localhost:8000)
  ↓ Socket
TWS Desktop (port 7496)
  ↓ ib_insync
TWS API
  ↓
✅ Returns fundamentals, short data, ratios, scanners
```

### Data Flow
```
1. User Request (Next.js) → "Screen pre-market stocks with 3%+ gap"
   ↓
2. Next.js → FastAPI: POST /api/screening/pre-market
   ↓
3. FastAPI → TWS API: Run scanner (TOP_PERC_GAIN)
   ↓
4. TWS API → FastAPI: 20 stocks with gaps
   ↓
5. FOR EACH STOCK:
   a. FastAPI → TWS: Get fundamentals (reqFundamentalData)
   b. FastAPI → TWS: Get short data (tick 236)
   c. FastAPI → TWS: Get ratios (tick 258)
   d. FastAPI → TWS: Get pre-market bars
   e. FastAPI → Finnhub: Get social sentiment
   ↓
6. FastAPI → Next.js: Combined screening results
   ↓
7. Next.js: Display results in UI
```

---

## 📁 Project Structure

### New Files to Create
```
/AICouncil
├── lib/trading/screening/
│   ├── tws-scanner.py              # NEW: Python TWS scanner client
│   ├── tws-fundamentals.py         # NEW: Fundamental data fetcher
│   ├── tws-short-data.py           # NEW: Short selling data fetcher
│   ├── tws-ratios.py               # NEW: Fundamental ratios fetcher
│   └── screening-orchestrator.py   # NEW: Combines all data sources
│
├── api/
│   ├── main.py                     # NEW: FastAPI server entry point
│   ├── routes/
│   │   └── screening.py            # NEW: Screening endpoints
│   └── models/
│       └── screening.py            # NEW: Pydantic models
│
├── scripts/
│   ├── start-screening-api.sh      # NEW: Start FastAPI server
│   └── test-screening-pipeline.py  # NEW: End-to-end test
│
├── requirements.txt                 # NEW: Python dependencies
└── pyproject.toml                   # NEW: Python project config
```

### Existing Files to Update
```
/AICouncil
├── app/api/trading/screening/
│   └── route.ts                    # UPDATE: Call FastAPI instead of Client Portal
│
├── lib/trading/screening/
│   ├── types.ts                    # UPDATE: Add TWS-specific types
│   └── ibkr-scanner.ts             # KEEP: Fallback to Client Portal
│
└── components/trading/
    └── pre-market-screener.tsx     # UPDATE: Use new API endpoint
```

---

## 🚀 Implementation Phases

### Phase 1: Python TWS Scanner Client (Days 1-3)

**Goal**: Replace TypeScript Client Portal scanner with Python TWS scanner

**Tasks**:
1. ✅ Install dependencies
   ```bash
   pip install ib_insync asyncio python-dotenv
   ```

2. ⏳ Create `lib/trading/screening/tws-scanner.py`
   ```python
   from ib_insync import *
   import asyncio

   class TWSScannerClient:
       def __init__(self, host='127.0.0.1', port=7496, client_id=1):
           self.ib = IB()
           self.host = host
           self.port = port
           self.client_id = client_id

       async def connect(self):
           await self.ib.connectAsync(self.host, self.port, self.client_id)

       async def scan_pre_market_gaps(self, min_gap_percent=3.0, min_volume=500000):
           """Scan for pre-market gappers"""
           scan = ScannerSubscription(
               instrument='STK',
               locationCode='STK.US.MAJOR',
               scanCode='TOP_PERC_GAIN',
               aboveVolume=min_volume
           )
           results = await self.ib.reqScannerDataAsync(scan)
           return results
   ```

3. ⏳ Test scanner independently
   ```bash
   python -m lib.trading.screening.tws-scanner
   ```

**Deliverables**:
- ✅ TWSScannerClient class working
- ✅ Can run TOP_PERC_GAIN scan
- ✅ Returns 20+ stocks

**Success Criteria**: Successfully scan for pre-market gappers and get contract details

---

### Phase 2: Fundamental Data Integration (Days 4-5)

**Goal**: Get P/E, EPS, Market Cap, Sector from TWS API

**Tasks**:
1. ⏳ Create `lib/trading/screening/tws-fundamentals.py`
   ```python
   class TWSFundamentalsClient:
       async def get_fundamentals(self, contract):
           """Get fundamental data from TWS API"""
           xml_data = await self.ib.reqFundamentalDataAsync(
               contract,
               'ReportSnapshot'
           )
           return self._parse_fundamentals_xml(xml_data)

       def _parse_fundamentals_xml(self, xml_data):
           """Parse XML to extract P/E, EPS, Market Cap, Sector"""
           import xml.etree.ElementTree as ET
           root = ET.fromstring(xml_data)

           return {
               'pe_ratio': self._extract_field(root, 'PE'),
               'eps': self._extract_field(root, 'EPS'),
               'market_cap': self._extract_field(root, 'MarketCap'),
               'sector': self._extract_field(root, 'Sector'),
               'industry': self._extract_field(root, 'Industry')
           }
   ```

2. ⏳ Test with AAPL
   ```python
   fundamentals = await client.get_fundamentals(aapl_contract)
   # Expected: {'pe_ratio': 36.58, 'eps': 7.43, ...}
   ```

**Deliverables**:
- ✅ Can extract P/E, EPS, Market Cap, Sector
- ✅ Handles XML parsing errors gracefully
- ✅ Returns structured data

**Success Criteria**: Get fundamentals for 20 stocks in <10 seconds

---

### Phase 3: Short Selling Data (Days 5-6)

**Goal**: Get shortable shares via tick 236

**Tasks**:
1. ⏳ Create `lib/trading/screening/tws-short-data.py`
   ```python
   class TWSShortDataClient:
       async def get_short_data(self, contract):
           """Get short selling data via tick 236"""
           ticker = self.ib.reqMktData(contract, '236', False, False)
           await asyncio.sleep(2)  # Wait for data

           short_data = {
               'shortable_shares': ticker.shortableShares,
               'short_fee_rate': getattr(ticker, 'shortFeeRate', None)
           }

           self.ib.cancelMktData(contract)
           return short_data
   ```

2. ⏳ Batch processing for multiple stocks
   ```python
   async def get_short_data_batch(self, contracts):
       """Get short data for multiple stocks efficiently"""
       tasks = [self.get_short_data(c) for c in contracts]
       return await asyncio.gather(*tasks)
   ```

**Deliverables**:
- ✅ Can get shortable shares count
- ✅ Batch processing for 20 stocks
- ✅ Handles stocks with no short data

**Success Criteria**: Get short data for 20 stocks in <5 seconds

---

### Phase 4: Fundamental Ratios (Days 6-7)

**Goal**: Get 60+ ratios via tick 258

**Tasks**:
1. ⏳ Create `lib/trading/screening/tws-ratios.py`
   ```python
   class TWSRatiosClient:
       async def get_ratios(self, contract):
           """Get 60+ fundamental ratios via tick 258"""
           ticker = self.ib.reqMktData(contract, '258', False, False)
           await asyncio.sleep(2)

           ratios = ticker.fundamentalRatios

           self.ib.cancelMktData(contract)

           return {
               'pe_ratio': ratios.PEEXCLXOR,
               'eps': ratios.AEPSNORM,
               'market_cap': ratios.MKTCAP,
               'beta': ratios.BETA,
               'roe': ratios.TTMROEPCT,
               'debt_to_equity': ratios.QTOTD2EQ,
               'current_ratio': ratios.QCURRATIO,
               'profit_margin': ratios.TTMNPMGN,
               'price_to_book': ratios.PRICE2BK,
               # ... 50+ more ratios available
           }
   ```

**Deliverables**:
- ✅ Extract 10-15 most important ratios
- ✅ Handle missing ratios gracefully
- ✅ Fast batch processing

**Success Criteria**: Get ratios for 20 stocks in <10 seconds

---

### Phase 5: Pre-Market Bars (Days 7-8)

**Goal**: Get 4am-9:30am bars for gap calculation

**Tasks**:
1. ⏳ Create `lib/trading/screening/tws-bars.py`
   ```python
   class TWSBarsClient:
       async def get_pre_market_bars(self, contract):
           """Get pre-market bars (4am-9:30am ET)"""
           bars = await self.ib.reqHistoricalDataAsync(
               contract,
               endDateTime='',
               durationStr='1 D',
               barSizeSetting='5 mins',
               whatToShow='TRADES',
               useRTH=False  # Include extended hours
           )

           # Filter for pre-market only
           pre_market_bars = [
               b for b in bars
               if b.date.hour < 9 or (b.date.hour == 9 and b.date.minute < 30)
           ]

           return self._calculate_gap(pre_market_bars, bars)

       def _calculate_gap(self, pre_market_bars, all_bars):
           """Calculate gap % from previous close"""
           if not pre_market_bars:
               return None

           pre_market_price = pre_market_bars[-1].close
           previous_close = all_bars[0].close
           gap_percent = ((pre_market_price - previous_close) / previous_close) * 100

           return {
               'gap_percent': gap_percent,
               'pre_market_price': pre_market_price,
               'previous_close': previous_close,
               'pre_market_volume': sum(b.volume for b in pre_market_bars)
           }
   ```

**Deliverables**:
- ✅ Get pre-market bars (4am-9:30am)
- ✅ Calculate gap %
- ✅ Calculate pre-market volume

**Success Criteria**: Get bars for 20 stocks in <15 seconds

---

### Phase 6: FastAPI REST Bridge (Days 8-10)

**Goal**: Expose Python TWS API as REST endpoints for Next.js

**Tasks**:
1. ⏳ Install FastAPI
   ```bash
   pip install fastapi uvicorn pydantic
   ```

2. ⏳ Create `api/main.py`
   ```python
   from fastapi import FastAPI
   from fastapi.middleware.cors import CORSMiddleware
   from api.routes import screening

   app = FastAPI(title="TWS Screening API")

   # CORS for Next.js
   app.add_middleware(
       CORSMiddleware,
       allow_origins=["http://localhost:3000"],
       allow_credentials=True,
       allow_methods=["*"],
       allow_headers=["*"],
   )

   app.include_router(screening.router, prefix="/api")
   ```

3. ⏳ Create `api/routes/screening.py`
   ```python
   from fastapi import APIRouter
   from api.models.screening import ScreeningRequest, ScreeningResponse
   from lib.trading.screening.screening_orchestrator import ScreeningOrchestrator

   router = APIRouter()

   @router.post("/screening/pre-market", response_model=ScreeningResponse)
   async def screen_pre_market(request: ScreeningRequest):
       """
       Screen pre-market stocks

       Request:
       {
           "min_gap_percent": 3.0,
           "min_volume": 500000,
           "max_results": 20,
           "include_sentiment": true
       }
       """
       orchestrator = ScreeningOrchestrator()
       results = await orchestrator.screen_pre_market(
           min_gap_percent=request.min_gap_percent,
           min_volume=request.min_volume,
           max_results=request.max_results,
           include_sentiment=request.include_sentiment
       )
       return results
   ```

4. ⏳ Create `api/models/screening.py`
   ```python
   from pydantic import BaseModel
   from typing import List, Optional

   class ScreeningRequest(BaseModel):
       min_gap_percent: float = 3.0
       min_volume: int = 500000
       max_results: int = 20
       include_sentiment: bool = True

   class StockResult(BaseModel):
       symbol: str
       gap_percent: float
       pre_market_volume: int
       fundamentals: dict
       short_data: dict
       ratios: dict
       sentiment: Optional[dict]
       score: float

   class ScreeningResponse(BaseModel):
       stocks: List[StockResult]
       total_scanned: int
       execution_time_seconds: float
   ```

5. ⏳ Create `scripts/start-screening-api.sh`
   ```bash
   #!/bin/bash
   uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
   ```

**Deliverables**:
- ✅ FastAPI server running on localhost:8000
- ✅ POST /api/screening/pre-market endpoint
- ✅ CORS enabled for Next.js
- ✅ Pydantic models for request/response

**Success Criteria**: Can call API from Next.js and get screening results

---

### Phase 7: Screening Orchestrator (Days 10-11)

**Goal**: Combine all data sources into single screening pipeline

**Tasks**:
1. ⏳ Create `lib/trading/screening/screening_orchestrator.py`
   ```python
   from lib.trading.screening.tws_scanner import TWSScannerClient
   from lib.trading.screening.tws_fundamentals import TWSFundamentalsClient
   from lib.trading.screening.tws_short_data import TWSShortDataClient
   from lib.trading.screening.tws_ratios import TWSRatiosClient
   from lib.trading.screening.tws_bars import TWSBarsClient
   from lib.trading.screening.finnhub_sentiment import FinnhubClient

   class ScreeningOrchestrator:
       def __init__(self):
           self.scanner = TWSScannerClient()
           self.fundamentals = TWSFundamentalsClient()
           self.short_data = TWSShortDataClient()
           self.ratios = TWSRatiosClient()
           self.bars = TWSBarsClient()
           self.sentiment = FinnhubClient()

       async def screen_pre_market(self, min_gap_percent, min_volume, max_results, include_sentiment):
           """Complete screening pipeline"""

           # 1. Connect to TWS
           await self.scanner.connect()

           # 2. Run scanner
           scan_results = await self.scanner.scan_pre_market_gaps(
               min_gap_percent=min_gap_percent,
               min_volume=min_volume
           )

           # 3. Get data for each stock
           enriched_results = []

           for data in scan_results[:max_results]:
               contract = data.contractDetails.contract

               # Parallel data fetching
               fundamentals, short_data, ratios, bars = await asyncio.gather(
                   self.fundamentals.get_fundamentals(contract),
                   self.short_data.get_short_data(contract),
                   self.ratios.get_ratios(contract),
                   self.bars.get_pre_market_bars(contract)
               )

               # Optional: Get sentiment
               sentiment = None
               if include_sentiment:
                   sentiment = await self.sentiment.get_sentiment(contract.symbol)

               # Calculate screening score
               score = self._calculate_score(
                   fundamentals, short_data, ratios, bars, sentiment
               )

               enriched_results.append({
                   'symbol': contract.symbol,
                   'gap_percent': bars['gap_percent'],
                   'pre_market_volume': bars['pre_market_volume'],
                   'fundamentals': fundamentals,
                   'short_data': short_data,
                   'ratios': ratios,
                   'sentiment': sentiment,
                   'score': score
               })

           # 4. Disconnect
           self.scanner.ib.disconnect()

           # 5. Sort by score
           enriched_results.sort(key=lambda x: x['score'], reverse=True)

           return {
               'stocks': enriched_results,
               'total_scanned': len(scan_results),
               'execution_time_seconds': time.time() - start_time
           }

       def _calculate_score(self, fundamentals, short_data, ratios, bars, sentiment):
           """Calculate composite screening score"""
           score = 0

           # Gap momentum (30% weight)
           score += abs(bars['gap_percent']) * 3

           # Volume (20% weight)
           if bars['pre_market_volume'] > 1000000:
               score += 20

           # Short squeeze potential (20% weight)
           if short_data['shortable_shares'] < 10000000:
               score += 20

           # Fundamentals (15% weight)
           if ratios.get('pe_ratio', 0) > 0 and ratios['pe_ratio'] < 30:
               score += 15

           # Sentiment (15% weight)
           if sentiment and sentiment.get('score', 0) > 0.5:
               score += 15

           return score
   ```

**Deliverables**:
- ✅ Complete screening pipeline
- ✅ Parallel data fetching for speed
- ✅ Screening score calculation
- ✅ Error handling

**Success Criteria**: Screen 20 stocks in <30 seconds with all data

---

### Phase 8: Finnhub Integration (Days 11-12)

**Goal**: Add social sentiment from Finnhub free tier

**Tasks**:
1. ⏳ Sign up for Finnhub API (free tier)
   - Visit: https://finnhub.io/register
   - Get API key

2. ⏳ Create `lib/trading/screening/finnhub_sentiment.py`
   ```python
   import aiohttp
   import os

   class FinnhubClient:
       def __init__(self, api_key=None):
           self.api_key = api_key or os.getenv('FINNHUB_API_KEY')
           self.base_url = 'https://finnhub.io/api/v1'

       async def get_sentiment(self, symbol):
           """Get social sentiment for a stock"""
           async with aiohttp.ClientSession() as session:
               url = f"{self.base_url}/stock/social-sentiment"
               params = {
                   'symbol': symbol,
                   'token': self.api_key
               }

               async with session.get(url, params=params) as response:
                   if response.status == 200:
                       data = await response.json()
                       return self._parse_sentiment(data)
                   return None

       def _parse_sentiment(self, data):
           """Parse Finnhub sentiment response"""
           if not data or 'reddit' not in data:
               return None

           reddit = data.get('reddit', {})
           twitter = data.get('twitter', {})

           return {
               'score': reddit.get('score', 0),  # -1 to 1
               'mentions': reddit.get('mention', 0),
               'positive_mentions': reddit.get('positiveMention', 0),
               'negative_mentions': reddit.get('negativeMention', 0),
               'buzz': twitter.get('score', 0)
           }
   ```

3. ⏳ Add to .env
   ```bash
   FINNHUB_API_KEY=your_api_key_here
   ```

**Deliverables**:
- ✅ Finnhub client working
- ✅ Can get sentiment for symbols
- ✅ Handles rate limits (60 calls/min on free tier)

**Success Criteria**: Get sentiment for 20 stocks within free tier limits

---

### Phase 9: Next.js Integration (Days 12-13)

**Goal**: Update Next.js app to use new FastAPI backend

**Tasks**:
1. ⏳ Update `app/api/trading/screening/route.ts`
   ```typescript
   export async function POST(request: Request) {
     const body = await request.json();

     // Call FastAPI instead of Client Portal
     const response = await fetch('http://localhost:8000/api/screening/pre-market', {
       method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         min_gap_percent: body.minGapPercent || 3.0,
         min_volume: body.minVolume || 500000,
         max_results: body.maxResults || 20,
         include_sentiment: body.includeSentiment ?? true
       })
     });

     const data = await response.json();
     return NextResponse.json(data);
   }
   ```

2. ⏳ Update `lib/trading/screening/types.ts`
   ```typescript
   export interface TWSScanResult extends ScanResult {
     shortData: {
       shortableShares: number;
       shortFeeRate?: number;
     };
     ratios: {
       peRatio: number;
       eps: number;
       marketCap: number;
       beta: number;
       roe: number;
       debtToEquity: number;
       currentRatio: number;
       profitMargin: number;
       priceToBook: number;
       // ... more ratios
     };
   }
   ```

3. ⏳ Update `components/trading/pre-market-screener.tsx`
   - Add short data display
   - Add ratios display
   - Add sentiment score visualization

**Deliverables**:
- ✅ Next.js calls FastAPI
- ✅ UI displays all new data fields
- ✅ Error handling

**Success Criteria**: UI shows complete screening results with all data

---

### Phase 10: Testing & Refinement (Days 13-14)

**Goal**: Test with real pre-market data and refine

**Tasks**:
1. ⏳ Create end-to-end test
   ```python
   # scripts/test-screening-pipeline.py
   import asyncio
   from lib.trading.screening.screening_orchestrator import ScreeningOrchestrator

   async def test_screening():
       orchestrator = ScreeningOrchestrator()

       results = await orchestrator.screen_pre_market(
           min_gap_percent=3.0,
           min_volume=500000,
           max_results=20,
           include_sentiment=True
       )

       print(f"Total stocks scanned: {results['total_scanned']}")
       print(f"Top 5 results:")
       for stock in results['stocks'][:5]:
           print(f"  {stock['symbol']}: Gap {stock['gap_percent']:.2f}%, Score {stock['score']:.1f}")

   asyncio.run(test_screening())
   ```

2. ⏳ Test during pre-market hours (4am-9:30am ET)
3. ⏳ Measure performance benchmarks
4. ⏳ Fix any issues
5. ⏳ Optimize slow queries

**Deliverables**:
- ✅ End-to-end test passing
- ✅ Real pre-market data validation
- ✅ Performance benchmarks met
- ✅ All edge cases handled

**Success Criteria**: Successfully screen real stocks during pre-market hours

---

## 🔧 Development Setup

### Prerequisites
```bash
# Python 3.9+
python --version

# TWS Desktop installed and running
# Port: 7496 (from your settings screenshot)

# Node.js for Next.js (already have)
node --version
```

### Installation Steps
```bash
# 1. Create Python virtual environment
cd /Users/user/AI-Counsil/AICouncil
python -m venv venv
source venv/bin/activate

# 2. Install Python dependencies
pip install ib_insync asyncio python-dotenv fastapi uvicorn pydantic aiohttp

# 3. Create requirements.txt
pip freeze > requirements.txt

# 4. Set up environment variables
echo "FINNHUB_API_KEY=your_key_here" >> .env

# 5. Test TWS connection
python scripts/test-tws-api.py
```

### Running the System
```bash
# Terminal 1: Start TWS Desktop
# (Open manually - TWS application)

# Terminal 2: Start FastAPI server
source venv/bin/activate
uvicorn api.main:app --reload --port 8000

# Terminal 3: Start Next.js dev server
npm run dev

# Terminal 4: Test screening
curl -X POST http://localhost:8000/api/screening/pre-market \
  -H "Content-Type: application/json" \
  -d '{"min_gap_percent": 3.0, "min_volume": 500000}'
```

---

## 📊 Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scanner execution | <5 seconds | Time to get 20 stocks from TWS |
| Fundamental data | <10 seconds | Time to get fundamentals for 20 stocks |
| Short data | <5 seconds | Time to get short data for 20 stocks |
| Ratios data | <10 seconds | Time to get ratios for 20 stocks |
| Pre-market bars | <15 seconds | Time to get bars for 20 stocks |
| Sentiment data | <10 seconds | Time to get sentiment for 20 stocks |
| **Total screening** | **<30 seconds** | **Complete pipeline for 20 stocks** |

---

## ⚠️ Risk Mitigation

### Potential Issues & Solutions

**Issue 1: TWS API Rate Limits**
- **Risk**: Too many requests too fast
- **Solution**: Implement request throttling, batch requests
- **Mitigation**: Use asyncio.gather with concurrency limits

**Issue 2: TWS Connection Instability**
- **Risk**: Socket disconnects during screening
- **Solution**: Auto-reconnect logic, connection pooling
- **Mitigation**: Keep-alive pings every 30 seconds

**Issue 3: Finnhub Rate Limits (60 calls/min)**
- **Risk**: Exceeding free tier limits
- **Solution**: Cache sentiment data, batch requests
- **Mitigation**: Implement rate limiter

**Issue 4: XML Parsing Errors**
- **Risk**: Fundamental data XML format changes
- **Solution**: Robust error handling, fallback parsing
- **Mitigation**: Log raw XML for debugging

**Issue 5: Missing Data Fields**
- **Risk**: Some stocks missing fundamentals/ratios
- **Solution**: Graceful degradation, default values
- **Mitigation**: Return partial results with warnings

---

## 📝 Testing Strategy

### Unit Tests
```python
# test_tws_scanner.py
async def test_scanner_connection():
    scanner = TWSScannerClient()
    await scanner.connect()
    assert scanner.ib.isConnected()

async def test_scan_pre_market():
    scanner = TWSScannerClient()
    results = await scanner.scan_pre_market_gaps()
    assert len(results) > 0

# test_tws_fundamentals.py
async def test_get_fundamentals():
    client = TWSFundamentalsClient()
    fundamentals = await client.get_fundamentals(aapl_contract)
    assert 'pe_ratio' in fundamentals
    assert fundamentals['pe_ratio'] > 0
```

### Integration Tests
```python
# test_screening_orchestrator.py
async def test_complete_screening():
    orchestrator = ScreeningOrchestrator()
    results = await orchestrator.screen_pre_market(
        min_gap_percent=3.0,
        min_volume=500000,
        max_results=5
    )
    assert len(results['stocks']) <= 5
    assert all('fundamentals' in s for s in results['stocks'])
    assert all('short_data' in s for s in results['stocks'])
```

### End-to-End Tests
```bash
# Test FastAPI endpoint
curl -X POST http://localhost:8000/api/screening/pre-market \
  -H "Content-Type: application/json" \
  -d '{"min_gap_percent": 3.0}' | jq

# Test Next.js integration
npm run test:e2e
```

---

## 🎯 Success Criteria

### Phase Completion Checklist
- [ ] Phase 1: TWS Scanner working ✅
- [ ] Phase 2: Fundamentals working ✅
- [ ] Phase 3: Short data working ✅
- [ ] Phase 4: Ratios working ✅
- [ ] Phase 5: Pre-market bars working ✅
- [ ] Phase 6: FastAPI server running ✅
- [ ] Phase 7: Orchestrator complete ✅
- [ ] Phase 8: Finnhub integrated ✅
- [ ] Phase 9: Next.js updated ✅
- [ ] Phase 10: E2E tests passing ✅

### Final Acceptance Criteria
- [ ] Can screen 20 pre-market stocks in <30 seconds
- [ ] All data fields populated (fundamentals, short, ratios, sentiment)
- [ ] UI displays results correctly
- [ ] No errors during normal operation
- [ ] Performance targets met
- [ ] Error handling robust
- [ ] Documentation complete

---

## 📚 Documentation Updates

### Files to Update
- [ ] `docs/trading/IBKR_DATA_AVAILABILITY.md` - Mark TWS API as active
- [ ] `docs/trading/PRE_MARKET_SCREENING_IMPLEMENTATION_STATUS.md` - Update progress
- [ ] `docs/workflow/PRIORITIES.md` - Mark TWS migration complete
- [ ] `docs/workflow/FEATURES.md` - Add TWS API integration as protected feature
- [ ] `README.md` - Update setup instructions with Python requirements

---

## 🚀 Next Steps After Migration

### Future Enhancements
1. **Explore More TWS Ticks** - Search for social sentiment in other tick types
2. **Real-Time Alerts** - Push notifications for gap breakouts
3. **Historical Performance** - Track screening results over time
4. **Advanced Filters** - Sector, industry, market cap ranges
5. **Backtesting** - Test screening strategy on historical data
6. **Portfolio Integration** - Auto-add screened stocks to watchlist

---

*Migration Plan Created: January 3, 2026*
*Estimated Timeline: 2 weeks*
*Next Action: Start Phase 1 - Python TWS Scanner Client*
