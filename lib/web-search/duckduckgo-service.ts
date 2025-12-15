// Free web search using DuckDuckGo - no API key required!

export interface DuckDuckGoSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface WebSearchResult {
  query: string;
  results: DuckDuckGoSearchResult[];
  searchTime?: number;
  cached?: boolean;
}

export class DuckDuckGoSearchService {
  private cache: Map<string, { data: WebSearchResult; timestamp: number }> = new Map();
  private cacheTimeout = 60 * 60 * 1000; // 1 hour

  constructor() {
    // No API key needed!
  }

  private getCacheKey(query: string): string {
    return query.toLowerCase().trim();
  }

  private checkCache(key: string): WebSearchResult | null {
    const cached = this.cache.get(key);
    if (cached) {
      const age = Date.now() - cached.timestamp;
      if (age < this.cacheTimeout) {
        return { ...cached.data, cached: true };
      }
      this.cache.delete(key);
    }
    return null;
  }

  async search(query: string, maxResults: number = 5): Promise<WebSearchResult | null> {
    // Check cache first
    const cacheKey = this.getCacheKey(query);
    const cached = this.checkCache(cacheKey);
    if (cached) {
      return cached;
    }

    const startTime = Date.now();

    try {
      // For now, we'll use a simple fetch to DuckDuckGo's HTML endpoint
      // In production, we'd use the duckduckgo-search npm package
      const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
      
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AICouncilBot/1.0)'
        }
      });

      if (!response.ok) {
        console.error('DuckDuckGo search failed:', response.status);
        return null;
      }

      const html = await response.text();
      
      // Parse HTML to extract results (simplified for now)
      // In production, use proper HTML parsing or the duckduckgo-search package
      const results: DuckDuckGoSearchResult[] = [];
      
      // Simple regex to extract results (this is a placeholder)
      // Real implementation would use cheerio or similar
      const linkRegex = /<a[^>]*class="result__url"[^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g;
      const snippetRegex = /<a[^>]*class="result__snippet"[^>]*>([^<]*)<\/a>/g;
      
      let match;
      let count = 0;
      while ((match = linkRegex.exec(html)) !== null && count < maxResults) {
        results.push({
          title: match[2] || 'No title',
          url: match[1],
          snippet: 'Search result from DuckDuckGo'
        });
        count++;
      }

      // NO MOCK DATA - Return actual results or nothing
      // If no results parsed, log warning and return empty array (NOT fake data)
      if (results.length === 0) {
        console.warn(`⚠️ DuckDuckGo: No results parsed for "${query}" - HTML structure may have changed`);
        // Return empty results, NOT fake data
        // User will see "No results found" which is honest
      }

      const searchResult: WebSearchResult = {
        query,
        results,
        searchTime: Date.now() - startTime,
        cached: false
      };

      // Cache the result
      this.cache.set(cacheKey, {
        data: searchResult,
        timestamp: Date.now()
      });

      return searchResult;
    } catch (error) {
      console.error('DuckDuckGo search error:', error);
      return null;
    }
  }

  formatForPrompt(searchResult: WebSearchResult): string {
    if (!searchResult || searchResult.results.length === 0) {
      return '';
    }

    let formatted = '\n\n--- Web Search Results (DuckDuckGo) ---\n';
    formatted += `Query: "${searchResult.query}"\n\n`;
    
    searchResult.results.forEach((result, index) => {
      formatted += `${index + 1}. ${result.title}\n`;
      formatted += `   ${result.url}\n`;
      formatted += `   ${result.snippet}\n\n`;
    });

    formatted += '--- End Web Search Results ---\n\n';
    return formatted;
  }

  clearCache(): void {
    this.cache.clear();
  }
}

// Singleton instance
let duckDuckGoService: DuckDuckGoSearchService | null = null;

export function getDuckDuckGoSearchService(): DuckDuckGoSearchService {
  if (!duckDuckGoService) {
    duckDuckGoService = new DuckDuckGoSearchService();
  }
  return duckDuckGoService;
}