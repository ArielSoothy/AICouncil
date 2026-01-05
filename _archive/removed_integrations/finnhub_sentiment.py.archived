#!/usr/bin/env python3
"""
Finnhub Sentiment Client - Social Sentiment Data

Gets social sentiment from Finnhub API (free tier: 60 calls/min).
This is the ONLY external API needed - TWS provides 90% of data.

Free Tier Limits:
- 60 API calls/minute
- Social sentiment for Reddit + Twitter

API Documentation: https://finnhub.io/docs/api/social-sentiment

Run: python -m lib.trading.screening.finnhub_sentiment
"""

import aiohttp
import asyncio
import os
from typing import Dict, Optional, List
from datetime import datetime


class FinnhubClient:
    """
    Finnhub API Client for Social Sentiment

    Fetches social sentiment scores from Reddit and Twitter.
    Free tier: 60 calls/minute.
    """

    def __init__(self, api_key: Optional[str] = None):
        """
        Initialize Finnhub Client

        Args:
            api_key: Finnhub API key (or use FINNHUB_API_KEY env var)
        """
        self.api_key = api_key or os.getenv('FINNHUB_API_KEY')
        self.base_url = 'https://finnhub.io/api/v1'

        if not self.api_key:
            print("[WARNING] ⚠️ No Finnhub API key found")
            print("  Set FINNHUB_API_KEY environment variable or pass api_key parameter")
            print("  Sign up at: https://finnhub.io/register")

    async def get_sentiment(self, symbol: str) -> Optional[Dict]:
        """
        Get social sentiment for a stock

        Args:
            symbol: Stock symbol (e.g., 'AAPL', 'TSLA')

        Returns:
            Dict with sentiment data:
            {
                'symbol': 'AAPL',
                'score': 0.75,           # -1 to 1 (bearish to bullish)
                'mentions': 234,         # Reddit mentions
                'positive_mentions': 189,
                'negative_mentions': 45,
                'sentiment_ratio': 0.81, # positive / total
                'buzz': 0.65            # Twitter buzz score
            }

            Returns None if API call fails or no data available
        """
        try:
            async with aiohttp.ClientSession() as session:
                url = f"{self.base_url}/stock/social-sentiment"
                params = {
                    'symbol': symbol,
                    'token': self.api_key
                }

                async with session.get(url, params=params) as response:
                    if response.status == 200:
                        data = await response.json()
                        return self._parse_sentiment(symbol, data)
                    elif response.status == 401:
                        print(f"[ERROR] Finnhub API: Invalid API key")
                        return None
                    elif response.status == 429:
                        print(f"[ERROR] Finnhub API: Rate limit exceeded (60 calls/min)")
                        return None
                    else:
                        print(f"[ERROR] Finnhub API: Status {response.status}")
                        return None

        except Exception as e:
            print(f"[ERROR] Finnhub API exception: {e}")
            return None

    def _parse_sentiment(self, symbol: str, data: Dict) -> Optional[Dict]:
        """
        Parse Finnhub sentiment response

        Args:
            symbol: Stock symbol
            data: Raw API response

        Returns:
            Parsed sentiment dict
        """
        if not data or 'reddit' not in data:
            return {
                'symbol': symbol,
                'score': 0,
                'mentions': 0,
                'positive_mentions': 0,
                'negative_mentions': 0,
                'sentiment_ratio': 0.5,
                'buzz': 0,
                'data_available': False
            }

        reddit = data.get('reddit', {})
        twitter = data.get('twitter', {})

        total_mentions = reddit.get('mention', 0)
        positive = reddit.get('positiveMention', 0)
        negative = reddit.get('negativeMention', 0)

        # Calculate sentiment ratio
        sentiment_ratio = 0.5  # Neutral default
        if total_mentions > 0:
            sentiment_ratio = positive / total_mentions

        return {
            'symbol': symbol,
            'score': reddit.get('score', 0),  # -1 to 1
            'mentions': total_mentions,
            'positive_mentions': positive,
            'negative_mentions': negative,
            'sentiment_ratio': round(sentiment_ratio, 2),
            'buzz': twitter.get('score', 0),
            'data_available': total_mentions > 0
        }

    async def get_sentiment_batch(
        self,
        symbols: List[str],
        delay_seconds: float = 1.0
    ) -> List[Dict]:
        """
        Get sentiment for multiple stocks with rate limiting

        Args:
            symbols: List of stock symbols
            delay_seconds: Delay between requests to avoid rate limit (default: 1.0)
                          Free tier: 60 calls/min = 1 call per second

        Returns:
            List of sentiment dicts
        """
        results = []

        for symbol in symbols:
            sentiment = await self.get_sentiment(symbol)
            if sentiment:
                results.append(sentiment)

            # Rate limiting: 60 calls/min = 1 per second
            if len(results) < len(symbols):  # Don't delay after last call
                await asyncio.sleep(delay_seconds)

        return results

    def calculate_sentiment_score(self, sentiment: Dict) -> float:
        """
        Calculate composite sentiment score (0-100)

        Args:
            sentiment: Sentiment dict from get_sentiment()

        Returns:
            Score from 0 (very bearish) to 100 (very bullish)

        Factors:
            - Sentiment score (-1 to 1) → 40 points
            - Sentiment ratio (0 to 1) → 30 points
            - Mention volume → 20 points
            - Buzz score → 10 points
        """
        score = 0.0

        # Factor 1: Sentiment score (-1 to 1) → 40 points
        # Convert -1 to 1 range to 0 to 40
        sentiment_score = sentiment.get('score', 0)
        score += (sentiment_score + 1) * 20  # -1→0, 0→20, 1→40

        # Factor 2: Sentiment ratio → 30 points
        sentiment_ratio = sentiment.get('sentiment_ratio', 0.5)
        score += sentiment_ratio * 30

        # Factor 3: Mention volume → 20 points
        mentions = sentiment.get('mentions', 0)
        if mentions > 1000:
            score += 20
        elif mentions > 500:
            score += 15
        elif mentions > 100:
            score += 10
        elif mentions > 50:
            score += 5

        # Factor 4: Buzz score → 10 points
        buzz = sentiment.get('buzz', 0)
        score += buzz * 10

        return min(100, round(score, 1))


async def main():
    """Test the Finnhub Sentiment Client"""
    print("=" * 70)
    print("Finnhub Sentiment Client - Test Run")
    print("=" * 70)

    # Initialize client
    client = FinnhubClient()

    if not client.api_key:
        print("\n[ERROR] No Finnhub API key found!")
        print("Sign up at: https://finnhub.io/register")
        print("Then set: export FINNHUB_API_KEY=your_key_here")
        return

    # Test 1: Single stock sentiment
    print("\n[TEST 1] Getting sentiment for AAPL...")
    aapl_sentiment = await client.get_sentiment('AAPL')

    if aapl_sentiment:
        print("[SUCCESS] ✅ Sentiment data received:")
        print(f"  Symbol: {aapl_sentiment['symbol']}")
        print(f"  Sentiment Score: {aapl_sentiment['score']:.2f} (-1 to 1)")
        print(f"  Mentions: {aapl_sentiment['mentions']:,}")
        print(f"  Positive: {aapl_sentiment['positive_mentions']:,}")
        print(f"  Negative: {aapl_sentiment['negative_mentions']:,}")
        print(f"  Ratio: {aapl_sentiment['sentiment_ratio']} (0 to 1)")
        print(f"  Buzz: {aapl_sentiment['buzz']}")

        # Calculate composite score
        composite_score = client.calculate_sentiment_score(aapl_sentiment)
        print(f"\n  Composite Sentiment Score: {composite_score}/100")

        if composite_score > 70:
            print(f"  → Very Bullish! 🚀")
        elif composite_score > 50:
            print(f"  → Bullish 📈")
        elif composite_score < 30:
            print(f"  → Very Bearish 📉")
        else:
            print(f"  → Neutral ⚖️")

    else:
        print("[FAIL] ❌ Failed to get sentiment data")

    # Test 2: Batch request
    print("\n[TEST 2] Batch sentiment for AAPL, TSLA, NVDA...")
    symbols = ['AAPL', 'TSLA', 'NVDA']

    batch_results = await client.get_sentiment_batch(symbols)

    print(f"[SUCCESS] ✅ Received sentiment for {len(batch_results)} stocks:")
    for result in batch_results:
        score = client.calculate_sentiment_score(result)
        print(f"  {result['symbol']}: Score {score}/100, Mentions: {result['mentions']}")

    print("\n" + "=" * 70)
    print("[COMPLETE] Finnhub test finished")
    print("=" * 70)


if __name__ == '__main__':
    print("Starting Finnhub Sentiment Client test...")
    print("Make sure FINNHUB_API_KEY is set!\n")
    asyncio.run(main())
