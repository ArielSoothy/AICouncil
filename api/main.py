"""
TWS Screening API - FastAPI Server

REST API bridge between Next.js frontend and TWS API (ib_insync).

Exposes pre-market stock screening capabilities:
- Scanner: 3,323 scan types
- Fundamentals: P/E, EPS, Market Cap, Sector
- Short Data: Shortable shares (CRITICAL!)
- Ratios: 60+ fundamental ratios
- Bars: Pre-market gaps and momentum
- Sentiment: Social sentiment (optional)

Server runs on localhost:8000 with CORS enabled for Next.js (localhost:3000).

Start server:
    uvicorn api.main:app --reload --host 0.0.0.0 --port 8000

API Documentation:
    http://localhost:8000/docs (Swagger UI)
    http://localhost:8000/redoc (ReDoc)

Prerequisites:
- TWS Desktop running on port 7496
- API enabled in TWS settings
- Market data subscriptions active ($14.50/mo)
- (Optional) FINNHUB_API_KEY environment variable for sentiment
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import screening_simple, screening_v2
from datetime import datetime
from dotenv import load_dotenv
import os

# ✅ Load environment variables from .env.local (for Supabase, API keys, etc.)
load_dotenv('.env.local')
load_dotenv()  # Also load .env if it exists


# Create FastAPI app
app = FastAPI(
    title="TWS Screening API",
    description="Pre-Market Stock Screening using Interactive Brokers TWS API",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware for Next.js
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",  # Next.js dev server
        "http://localhost:3001",  # Alternative port
        "https://localhost:3000",  # HTTPS
    ],
    allow_credentials=True,
    allow_methods=["*"],  # Allow all HTTP methods
    allow_headers=["*"],  # Allow all headers
)

# Include routers
app.include_router(screening_simple.router, prefix="/api")  # Simple synchronous scanner
app.include_router(screening_v2.router, prefix="/api")  # V2: Production-ready background jobs


@app.get("/")
async def root():
    """
    Root endpoint

    Returns API information and status.
    """
    return {
        "name": "TWS Screening API",
        "version": "1.0.0",
        "description": "Pre-Market Stock Screening using Interactive Brokers TWS API",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "screening": "/api/screening/pre-market (POST)",
            "health": "/api/health (GET)",
            "docs": "/docs (Swagger UI)",
            "redoc": "/redoc (ReDoc)"
        },
        "prerequisites": {
            "tws_desktop": "Running on port 7496",
            "api_enabled": "TWS → Global Configuration → API → Settings",
            "market_data": "US Securities Snapshot + Streaming ($14.50/mo)",
            "finnhub_key": "Optional - Set FINNHUB_API_KEY for sentiment"
        }
    }


@app.on_event("startup")
async def startup_event():
    """
    Startup event handler

    Prints server information on startup.
    """
    print("\n" + "=" * 70)
    print("TWS SCREENING API - SERVER STARTING")
    print("=" * 70)
    print(f"Server: http://localhost:8000")
    print(f"Docs: http://localhost:8000/docs")
    print(f"Health: http://localhost:8000/api/health")
    print(f"Screening: POST http://localhost:8000/api/screening/pre-market")
    print("=" * 70)
    print("\nPrerequisites:")
    print("  ✓ TWS Desktop running on port 7496")
    print("  ✓ API enabled in TWS settings")
    print("  ✓ Market data subscriptions active ($14.50/mo)")
    print("  ✓ (Optional) FINNHUB_API_KEY environment variable")
    print("\n" + "=" * 70 + "\n")


@app.on_event("shutdown")
async def shutdown_event():
    """
    Shutdown event handler

    Cleanup on server shutdown.
    """
    print("\n" + "=" * 70)
    print("TWS SCREENING API - SERVER SHUTTING DOWN")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "api.main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )
