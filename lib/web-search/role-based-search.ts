import { WebSearchService, type WebSearchResult } from './web-search-service';

export interface AgentSearchContext {
  role: 'analyst' | 'critic' | 'synthesizer';
  round: number;
  previousMessages: Array<{
    role: string;
    content: string;
    agentName?: string;
  }>;
  originalQuery: string;
}

export interface RoleBasedSearchResult {
  queries: string[];
  results: WebSearchResult[];
  searchRationale: string;
  role: string;
  round: number;
}

export class RoleBasedSearchService {
  private webSearchService: WebSearchService;

  constructor() {
    this.webSearchService = new WebSearchService({
      enabled: true,
      provider: 'duckduckgo',
      maxResults: 5,
      cache: true,
      includeInPrompt: true
    });
  }

  /**
   * Generate role-specific search queries based on agent role and debate context
   */
  async performRoleBasedSearch(context: AgentSearchContext): Promise<RoleBasedSearchResult | null> {
    if (!this.webSearchService.isEnabled()) {
      return null;
    }

    try {
      const queries = this.generateRoleSpecificQueries(context);
      const results: WebSearchResult[] = [];
      
      // Perform searches for each query
      for (const query of queries) {
        const searchResult = await this.webSearchService.search(query);
        if (searchResult) {
          results.push(searchResult);
        }
      }

      return {
        queries,
        results,
        searchRationale: this.getSearchRationale(context),
        role: context.role,
        round: context.round
      };
    } catch (error) {
      console.error('Role-based search failed:', error);
      return null;
    }
  }

  /**
   * Generate search queries specific to each agent role and round
   */
  private generateRoleSpecificQueries(context: AgentSearchContext): string[] {
    const { role, round, previousMessages, originalQuery } = context;

    // Extract key topics from the original query
    const queryTopics = this.extractTopicsFromQuery(originalQuery);

    if (round === 1) {
      return this.generateRound1Queries(role, originalQuery, queryTopics);
    } else {
      return this.generateRound2Queries(role, originalQuery, queryTopics, previousMessages);
    }
  }

  /**
   * Generate Round 1 queries based on agent role
   */
  private generateRound1Queries(
    role: 'analyst' | 'critic' | 'synthesizer',
    originalQuery: string,
    topics: string[]
  ): string[] {
    const queries: string[] = [];

    switch (role) {
      case 'analyst':
        // Analyst searches for facts, data, evidence first
        queries.push(
          originalQuery, // Original query for base facts
          `${topics.join(' ')} facts data statistics 2024 2025`,
          `best ${topics.join(' ')} reviews ratings comparison`,
          `${topics.join(' ')} expert recommendations research studies`
        );
        break;

      case 'critic':
        // Critic searches for problems, issues, complaints after seeing Analyst
        const analystContent = this.getLatestMessageFromRole('analyst', []);
        if (analystContent) {
          const analystTopics = this.extractRecommendationsFromContent(analystContent);
          queries.push(
            ...analystTopics.map(topic => `problems with ${topic} issues complaints`),
            ...analystTopics.map(topic => `${topic} negative reviews drawbacks disadvantages`),
            `why ${topics.join(' ')} might not work risks downsides`
          );
        } else {
          // Fallback if no analyst content yet
          queries.push(
            `${topics.join(' ')} problems issues complaints`,
            `${topics.join(' ')} drawbacks disadvantages risks`
          );
        }
        break;

      case 'synthesizer':
        // Synthesizer searches for alternatives and balanced solutions after seeing debate
        queries.push(
          `alternatives to ${topics.join(' ')} other options`,
          `${topics.join(' ')} middle ground balanced solutions`,
          `best ${topics.join(' ')} consensus expert opinions`,
          `${topics.join(' ')} comprehensive comparison pros and cons`
        );
        break;
    }

    return queries.filter(q => q.length > 0).slice(0, 3); // Limit to 3 queries per agent
  }

  /**
   * Generate Round 2 queries based on previous debate context
   */
  private generateRound2Queries(
    role: 'analyst' | 'critic' | 'synthesizer',
    originalQuery: string,
    topics: string[],
    previousMessages: Array<{ role: string; content: string; agentName?: string }>
  ): string[] {
    const queries: string[] = [];
    const contestedPoints = this.extractContestedPoints(previousMessages);
    const debatedItems = this.extractDebatedItems(previousMessages);

    switch (role) {
      case 'analyst':
        // Analyst searches for updated data on contested points
        queries.push(
          ...contestedPoints.map(point => `updated data on ${point} recent studies 2024 2025`),
          ...debatedItems.map(item => `${item} recent reviews latest information`),
          `${topics.join(' ')} new research findings latest news`
        );
        break;

      case 'critic':
        // Critic searches for rebuttals to new evidence
        const analystEvidence = this.getLatestMessageFromRole('analyst', previousMessages);
        if (analystEvidence) {
          const newClaims = this.extractClaimsFromContent(analystEvidence);
          queries.push(
            ...newClaims.map(claim => `rebuttals to ${claim} counterarguments`),
            ...debatedItems.map(item => `why ${item} might not work criticism`),
            `${topics.join(' ')} skeptical analysis limitations`
          );
        }
        break;

      case 'synthesizer':
        // Synthesizer searches for consensus opinions
        queries.push(
          ...debatedItems.map(item => `${item} consensus expert opinions balanced review`),
          `${topics.join(' ')} meta analysis systematic review`,
          `best practices for ${topics.join(' ')} evidence-based recommendations`
        );
        break;
    }

    return queries.filter(q => q.length > 0).slice(0, 3);
  }

  /**
   * Extract main topics from the original query
   */
  private extractTopicsFromQuery(query: string): string[] {
    // Simple keyword extraction - could be enhanced with NLP
    const stopWords = new Set(['what', 'is', 'the', 'best', 'how', 'to', 'for', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'by', 'with']);
    const words = query.toLowerCase().split(/\s+/).filter(word => 
      word.length > 2 && !stopWords.has(word) && /^[a-zA-Z]+$/.test(word)
    );
    
    // Return top keywords (could be improved with TF-IDF or similar)
    return words.slice(0, 5);
  }

  /**
   * Extract recommendations from agent content
   */
  private extractRecommendationsFromContent(content: string): string[] {
    // Look for product names, brand names, specific recommendations
    const recommendations: string[] = [];
    
    // Simple pattern matching for recommendations
    const patterns = [
      /recommend(?:s|ed)?\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\n|$)/g,
      /suggest(?:s|ed)?\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\n|$)/g,
      /best\s+(?:choice|option|is)\s+([A-Z][a-zA-Z\s]+?)(?:\.|,|\n|$)/g,
      /([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*)\s+is\s+(?:excellent|great|recommended|ideal)/g
    ];

    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const recommendation = match[1].trim();
        if (recommendation.length > 3 && recommendation.length < 50) {
          recommendations.push(recommendation);
        }
      }
    });

    return [...new Set(recommendations)].slice(0, 3); // Dedupe and limit
  }

  /**
   * Extract contested points from debate messages
   */
  private extractContestedPoints(messages: Array<{ role: string; content: string }>): string[] {
    const points: string[] = [];
    
    // Look for disagreement indicators
    const disagreementPatterns = [
      /however[,\s]+(.+?)(?:\.|,|\n|$)/gi,
      /but[,\s]+(.+?)(?:\.|,|\n|$)/gi,
      /disagree\s+(?:with\s+)?(.+?)(?:\.|,|\n|$)/gi,
      /problem\s+with\s+(.+?)(?:\.|,|\n|$)/gi
    ];

    messages.forEach(msg => {
      disagreementPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(msg.content)) !== null) {
          const point = match[1].trim();
          if (point.length > 5 && point.length < 100) {
            points.push(point);
          }
        }
      });
    });

    return [...new Set(points)].slice(0, 3);
  }

  /**
   * Extract debated items (products, solutions, etc.)
   */
  private extractDebatedItems(messages: Array<{ role: string; content: string }>): string[] {
    const items = new Set<string>();
    
    messages.forEach(msg => {
      // Extract capitalized terms that might be product names or solutions
      const capitalizedTerms = msg.content.match(/\b[A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]+)*\b/g) || [];
      capitalizedTerms.forEach(term => {
        if (term.length > 3 && term.length < 30 && !['However', 'Therefore', 'Additionally'].includes(term)) {
          items.add(term);
        }
      });
    });

    return Array.from(items).slice(0, 5);
  }

  /**
   * Extract claims from content for rebuttal searches
   */
  private extractClaimsFromContent(content: string): string[] {
    // Look for assertion patterns
    const claimPatterns = [
      /(?:studies show|research indicates|data suggests)\s+(.+?)(?:\.|,|\n|$)/gi,
      /(?:proven to|demonstrated to|shown to)\s+(.+?)(?:\.|,|\n|$)/gi,
      /(?:evidence suggests|findings indicate)\s+(.+?)(?:\.|,|\n|$)/gi
    ];

    const claims: string[] = [];
    claimPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const claim = match[1].trim();
        if (claim.length > 5 && claim.length < 100) {
          claims.push(claim);
        }
      }
    });

    return [...new Set(claims)].slice(0, 3);
  }

  /**
   * Get the latest message from a specific role
   */
  private getLatestMessageFromRole(
    role: string, 
    messages: Array<{ role: string; content: string; agentName?: string }>
  ): string | null {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === role) {
        return messages[i].content;
      }
    }
    return null;
  }

  /**
   * Get rationale for why this search was performed
   */
  private getSearchRationale(context: AgentSearchContext): string {
    const { role, round } = context;
    
    if (round === 1) {
      switch (role) {
        case 'analyst':
          return "Searching for factual data and evidence to establish the foundation for analysis";
        case 'critic':
          return "Searching for potential problems and issues with the Analyst's recommendations";
        case 'synthesizer':
          return "Searching for alternative solutions and balanced perspectives";
        default:
          return "Performing role-based web search";
      }
    } else {
      switch (role) {
        case 'analyst':
          return "Searching for updated data and recent information on contested points from the previous round";
        case 'critic':
          return "Searching for rebuttals and counterarguments to new evidence presented";
        case 'synthesizer':
          return "Searching for consensus opinions and expert recommendations on debated topics";
        default:
          return "Performing progressive search based on debate context";
      }
    }
  }

  /**
   * Format search results for inclusion in agent prompts
   */
  formatSearchResultsForPrompt(searchResult: RoleBasedSearchResult): string {
    if (!searchResult || searchResult.results.length === 0) {
      return '';
    }

    let formattedResults = `\n\n=== WEB SEARCH RESULTS (${searchResult.role.toUpperCase()}) ===\n`;
    formattedResults += `Search Rationale: ${searchResult.searchRationale}\n\n`;

    searchResult.results.forEach((result, index) => {
      formattedResults += `Query ${index + 1}: "${result.query}"\n`;
      if (result.results && result.results.length > 0) {
        result.results.slice(0, 3).forEach((item, itemIndex) => {
          formattedResults += `${itemIndex + 1}. ${item.title}\n`;
          formattedResults += `   ${item.snippet}\n`;
          formattedResults += `   Source: ${item.url}\n\n`;
        });
      }
      formattedResults += '\n';
    });

    formattedResults += '=== END WEB SEARCH RESULTS ===\n\n';
    return formattedResults;
  }
}

// Singleton instance
let roleBasedSearchService: RoleBasedSearchService | null = null;

export function getRoleBasedSearchService(): RoleBasedSearchService {
  if (!roleBasedSearchService) {
    roleBasedSearchService = new RoleBasedSearchService();
  }
  return roleBasedSearchService;
}