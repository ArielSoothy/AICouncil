import { getDuckDuckGoSearchService, type WebSearchResult as DuckDuckGoResult } from './duckduckgo-service';

export interface WebSearchConfig {
  enabled: boolean;
  provider: 'duckduckgo' | 'none';
  maxResults: number;
  cache: boolean;
  includeInPrompt: boolean;
}

export interface WebSearchResult {
  query: string;
  results: Array<{
    title: string;
    url: string;
    snippet: string;
  }>;
  searchTime?: number;
  cached?: boolean;
}

export class WebSearchService {
  private config: WebSearchConfig;

  constructor(config?: Partial<WebSearchConfig>) {
    this.config = {
      enabled: true,
      provider: 'duckduckgo',
      maxResults: 5,
      cache: true,
      includeInPrompt: true,
      ...config,
    };
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.provider !== 'none';
  }

  async search(query: string): Promise<WebSearchResult | null> {
    if (!this.isEnabled()) {
      return null;
    }

    try {
      switch (this.config.provider) {
        case 'duckduckgo':
          return await this.searchWithDuckDuckGo(query);
        default:
          return null;
      }
    } catch (error) {
      console.error('Web search error:', error);
      return null;
    }
  }

  private async searchWithDuckDuckGo(query: string): Promise<WebSearchResult | null> {
    const service = getDuckDuckGoSearchService();
    
    try {
      const result = await service.search(query, this.config.maxResults);
      return result;
    } catch (error) {
      console.error('DuckDuckGo search failed:', error);
      return null;
    }
  }

  formatForPrompt(searchResult: WebSearchResult): string {
    if (!this.config.includeInPrompt || !searchResult) {
      return '';
    }

    const service = getDuckDuckGoSearchService();
    return service.formatForPrompt(searchResult as DuckDuckGoResult);
  }

  // Check if a query might benefit from web search
  static shouldSearch(query: string): boolean {
    const searchIndicators = [
      'latest', 'recent', 'today', 'current', 'news',
      'price', 'cost', 'stock', 'weather', 'score',
      'who won', 'what happened', 'when did', 'where is',
      '2024', '2025', 'this year', 'last week', 'yesterday',
      'compare', 'versus', 'vs', 'review', 'best',
    ];

    const lowerQuery = query.toLowerCase();
    return searchIndicators.some(indicator => lowerQuery.includes(indicator));
  }

  // Extract search-worthy query from user input
  static extractSearchQuery(input: string): string | null {
    // Remove common question prefixes
    const prefixes = [
      'can you search for',
      'search for',
      'look up',
      'find information about',
      'what is the latest on',
      'tell me about',
    ];

    let query = input.toLowerCase();
    for (const prefix of prefixes) {
      if (query.startsWith(prefix)) {
        return input.slice(prefix.length).trim();
      }
    }

    // If query is a question or contains search indicators, use as-is
    if (this.shouldSearch(input)) {
      return input;
    }

    return null;
  }
}

// Singleton instance
let webSearchService: WebSearchService | null = null;

export function getWebSearchService(config?: Partial<WebSearchConfig>): WebSearchService {
  if (!webSearchService) {
    webSearchService = new WebSearchService(config);
  }
  return webSearchService;
}

// Integration helper for consensus models
export async function enrichQueryWithWebSearch(
  query: string,
  config?: Partial<WebSearchConfig>
): Promise<{ query: string; searchContext?: string; sources?: string[] }> {
  const service = getWebSearchService(config);
  
  if (!service.isEnabled()) {
    return { query };
  }

  // Check if query would benefit from search
  const searchQuery = WebSearchService.extractSearchQuery(query) || 
                     (WebSearchService.shouldSearch(query) ? query : null);

  if (!searchQuery) {
    return { query };
  }

  const searchResult = await service.search(searchQuery);
  
  if (!searchResult) {
    return { query };
  }

  const searchContext = service.formatForPrompt(searchResult);
  const enrichedQuery = query + searchContext;
  const sources = searchResult.results.map(r => r.url);

  return {
    query: enrichedQuery,
    searchContext,
    sources,
  };
}