#!/usr/bin/env python3
"""
Reddit Sentiment Analyzer - FREE Social Sentiment for Stock Screening

Uses Reddit's API to get stock mentions and sentiment from popular trading subreddits.
NO API key required for basic read access (uses public JSON endpoints).

Subreddits monitored:
- r/wallstreetbets (11M+ members) - Retail sentiment
- r/stocks (6M+ members) - General stock discussion
- r/investing (2M+ members) - Long-term focus
- r/options (1M+ members) - Options flow

Data returned:
- mentions_24h: Number of mentions in last 24 hours
- sentiment_score: -1 to +1 (negative to positive)
- top_comments: Sample of recent comments
- buzz_score: Relative activity vs baseline

Author: AI Council
Date: January 2026
"""

import aiohttp
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple
import re
from collections import defaultdict


# Subreddits to monitor (by relevance)
TRADING_SUBREDDITS = [
    'wallstreetbets',  # Most active, retail sentiment
    'stocks',          # General discussion
    'investing',       # Long-term focus
    'options',         # Options flow
    'stockmarket',     # News/discussion
]

# Simple sentiment keywords (expand as needed)
POSITIVE_KEYWORDS = {
    'moon', 'rocket', 'bullish', 'buy', 'calls', 'long', 'green',
    'pump', 'squeeze', 'breaking out', 'tendies', 'diamond hands',
    'to the moon', 'lfg', 'lets go', 'undervalued', 'oversold',
    'bounce', 'reversal', 'upside', 'gain', 'profit', 'winner'
}

NEGATIVE_KEYWORDS = {
    'dump', 'puts', 'short', 'bearish', 'sell', 'red', 'crash',
    'tank', 'bag holder', 'loss', 'overvalued', 'overbought',
    'dead', 'rip', 'drill', 'fade', 'downside', 'avoid', 'scam'
}

# User-agent for Reddit API (required)
USER_AGENT = 'AICouncil/1.0 (Stock Screening Tool)'


class RedditSentimentClient:
    """
    Fetch stock sentiment from Reddit trading subreddits.

    Uses Reddit's public JSON API (no auth required for read access).
    Rate limited to 10 requests/minute to be respectful.
    """

    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self.last_request_time = datetime.min
        self.min_request_interval = 2  # seconds between requests (was 6 - too slow!)

    async def _ensure_session(self):
        """Create aiohttp session if needed"""
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(
                headers={'User-Agent': USER_AGENT}
            )

    async def _rate_limit(self):
        """Respect Reddit rate limits"""
        now = datetime.now()
        elapsed = (now - self.last_request_time).total_seconds()
        if elapsed < self.min_request_interval:
            await asyncio.sleep(self.min_request_interval - elapsed)
        self.last_request_time = datetime.now()

    async def close(self):
        """Close the session"""
        if self.session and not self.session.closed:
            await self.session.close()

    async def search_symbol(self, symbol: str, subreddit: str = 'wallstreetbets', limit: int = 25) -> List[Dict]:
        """
        Search for posts mentioning a stock symbol in a subreddit.

        Args:
            symbol: Stock ticker (e.g., 'AAPL', 'TSLA')
            subreddit: Subreddit to search
            limit: Max posts to return

        Returns:
            List of post data dictionaries
        """
        await self._ensure_session()
        await self._rate_limit()

        # Search for ticker mentions (with $ prefix common in WSB)
        query = f"${symbol} OR {symbol}"
        url = f"https://www.reddit.com/r/{subreddit}/search.json"
        params = {
            'q': query,
            'sort': 'new',
            'limit': limit,
            't': 'day',  # Last 24 hours
            'restrict_sr': 'true'
        }

        try:
            async with self.session.get(url, params=params, timeout=10) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    posts = []
                    for child in data.get('data', {}).get('children', []):
                        post = child.get('data', {})
                        posts.append({
                            'title': post.get('title', ''),
                            'selftext': post.get('selftext', '')[:500],  # Truncate
                            'score': post.get('score', 0),
                            'upvote_ratio': post.get('upvote_ratio', 0.5),
                            'num_comments': post.get('num_comments', 0),
                            'created_utc': post.get('created_utc', 0),
                            'subreddit': subreddit,
                            'url': f"https://reddit.com{post.get('permalink', '')}"
                        })
                    return posts
                elif resp.status == 429:
                    print(f"[Reddit] Rate limited on r/{subreddit}")
                    return []
                else:
                    print(f"[Reddit] Error {resp.status} on r/{subreddit}")
                    return []
        except Exception as e:
            print(f"[Reddit] Error searching r/{subreddit}: {e}")
            return []

    def _analyze_sentiment(self, text: str) -> float:
        """
        Simple keyword-based sentiment analysis.

        Returns:
            Score from -1 (very negative) to +1 (very positive)
        """
        text_lower = text.lower()

        positive_count = sum(1 for kw in POSITIVE_KEYWORDS if kw in text_lower)
        negative_count = sum(1 for kw in NEGATIVE_KEYWORDS if kw in text_lower)

        total = positive_count + negative_count
        if total == 0:
            return 0.0  # Neutral

        # Score from -1 to +1
        return (positive_count - negative_count) / total

    def _calculate_buzz_score(self, mentions: int, avg_mentions: int = 5) -> float:
        """
        Calculate relative buzz vs baseline.

        Returns:
            Buzz score (1.0 = average, 2.0 = 2x normal, etc.)
        """
        if avg_mentions <= 0:
            avg_mentions = 5  # Default baseline
        return mentions / avg_mentions

    async def get_sentiment(self, symbol: str) -> Dict:
        """
        Get comprehensive sentiment data for a stock symbol.

        Searches multiple subreddits and aggregates results.

        Args:
            symbol: Stock ticker (e.g., 'AAPL')

        Returns:
            Dict with:
            - mentions_24h: Total mentions
            - sentiment_score: -1 to +1
            - buzz_score: Relative activity
            - top_posts: Sample of recent posts
            - subreddit_breakdown: Mentions by subreddit
        """
        symbol = symbol.upper().strip()
        all_posts = []
        subreddit_counts = defaultdict(int)

        # Search each subreddit (reduced to 2 for speed - WSB + stocks are most relevant)
        for subreddit in TRADING_SUBREDDITS[:2]:  # Top 2 for speed
            posts = await self.search_symbol(symbol, subreddit, limit=25)
            all_posts.extend(posts)
            subreddit_counts[subreddit] = len(posts)

        if not all_posts:
            return {
                'symbol': symbol,
                'mentions_24h': 0,
                'sentiment_score': 0.0,
                'buzz_score': 0.0,
                'top_posts': [],
                'subreddit_breakdown': dict(subreddit_counts),
                'analyzed_at': datetime.now().isoformat()
            }

        # Aggregate sentiment
        total_sentiment = 0.0
        total_weight = 0

        for post in all_posts:
            text = f"{post['title']} {post['selftext']}"
            sentiment = self._analyze_sentiment(text)

            # Weight by engagement (upvotes + comments)
            weight = max(1, post['score'] + post['num_comments'])
            total_sentiment += sentiment * weight
            total_weight += weight

        avg_sentiment = total_sentiment / total_weight if total_weight > 0 else 0.0

        # Sort by engagement for top posts
        top_posts = sorted(all_posts, key=lambda x: x['score'] + x['num_comments'], reverse=True)[:5]

        return {
            'symbol': symbol,
            'mentions_24h': len(all_posts),
            'sentiment_score': round(avg_sentiment, 3),
            'sentiment_label': self._sentiment_label(avg_sentiment),
            'buzz_score': round(self._calculate_buzz_score(len(all_posts)), 2),
            'top_posts': top_posts,
            'subreddit_breakdown': dict(subreddit_counts),
            'analyzed_at': datetime.now().isoformat()
        }

    def _sentiment_label(self, score: float) -> str:
        """Convert score to human-readable label"""
        if score > 0.5:
            return 'VERY_BULLISH'
        elif score > 0.2:
            return 'BULLISH'
        elif score > -0.2:
            return 'NEUTRAL'
        elif score > -0.5:
            return 'BEARISH'
        else:
            return 'VERY_BEARISH'

    async def get_batch_sentiment(self, symbols: List[str]) -> Dict[str, Dict]:
        """
        Get sentiment for multiple symbols.

        Args:
            symbols: List of stock tickers

        Returns:
            Dict mapping symbol to sentiment data
        """
        results = {}
        for symbol in symbols:
            try:
                results[symbol] = await self.get_sentiment(symbol)
            except Exception as e:
                print(f"[Reddit] Error getting sentiment for {symbol}: {e}")
                results[symbol] = {
                    'symbol': symbol,
                    'mentions_24h': 0,
                    'sentiment_score': 0.0,
                    'error': str(e)
                }
        return results


async def main():
    """Test the Reddit sentiment client"""
    print("=" * 60)
    print("REDDIT SENTIMENT TEST")
    print("=" * 60)

    client = RedditSentimentClient()

    try:
        # Test with popular stocks
        test_symbols = ['NVDA', 'TSLA', 'AAPL']

        for symbol in test_symbols:
            print(f"\n🔍 Searching for {symbol}...")
            sentiment = await client.get_sentiment(symbol)

            print(f"\n📊 {symbol} Sentiment:")
            print(f"  Mentions (24h): {sentiment['mentions_24h']}")
            print(f"  Sentiment: {sentiment['sentiment_score']:.2f} ({sentiment.get('sentiment_label', 'N/A')})")
            print(f"  Buzz Score: {sentiment['buzz_score']:.1f}x")
            print(f"  Subreddits: {sentiment['subreddit_breakdown']}")

            if sentiment['top_posts']:
                print(f"\n  Top Post: {sentiment['top_posts'][0]['title'][:60]}...")

            print("-" * 40)

    finally:
        await client.close()

    print("\n✅ Test complete!")


if __name__ == '__main__':
    asyncio.run(main())
