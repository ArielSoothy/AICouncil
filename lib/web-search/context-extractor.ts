/**
 * Context Extractor - Advanced text analysis for role-based search
 * Extracts searchable topics, entities, and context from debate messages
 */

export interface ExtractedContext {
  mainTopics: string[];
  entities: string[];
  sentiments: Array<{ entity: string; sentiment: 'positive' | 'negative' | 'neutral'; confidence: number }>;
  keyPhrases: string[];
  questions: string[];
  recommendations: string[];
  criticisms: string[];
  contested_points: string[];
}

export interface DebateMessage {
  role: 'analyst' | 'critic' | 'synthesizer';
  content: string;
  agentName?: string;
  round: number;
}

export class ContextExtractor {
  
  /**
   * Extract comprehensive context from a debate message
   */
  extractFromMessage(message: DebateMessage): ExtractedContext {
    const content = message.content;
    
    return {
      mainTopics: this.extractMainTopics(content),
      entities: this.extractEntities(content),
      sentiments: this.extractSentiments(content),
      keyPhrases: this.extractKeyPhrases(content),
      questions: this.extractQuestions(content),
      recommendations: this.extractRecommendations(content),
      criticisms: this.extractCriticisms(content),
      contested_points: this.extractContestedPoints(content)
    };
  }

  /**
   * Extract context from multiple debate messages
   */
  extractFromDebate(messages: DebateMessage[]): ExtractedContext {
    const combinedContext: ExtractedContext = {
      mainTopics: [],
      entities: [],
      sentiments: [],
      keyPhrases: [],
      questions: [],
      recommendations: [],
      criticisms: [],
      contested_points: []
    };

    messages.forEach(message => {
      const messageContext = this.extractFromMessage(message);
      
      // Merge results, avoiding duplicates
      combinedContext.mainTopics.push(...messageContext.mainTopics);
      combinedContext.entities.push(...messageContext.entities);
      combinedContext.sentiments.push(...messageContext.sentiments);
      combinedContext.keyPhrases.push(...messageContext.keyPhrases);
      combinedContext.questions.push(...messageContext.questions);
      combinedContext.recommendations.push(...messageContext.recommendations);
      combinedContext.criticisms.push(...messageContext.criticisms);
      combinedContext.contested_points.push(...messageContext.contested_points);
    });

    // Deduplicate and rank by frequency
    return this.deduplicateAndRank(combinedContext);
  }

  /**
   * Generate search queries from extracted context
   */
  generateSearchQueries(
    context: ExtractedContext, 
    originalQuery: string,
    role: 'analyst' | 'critic' | 'synthesizer',
    round: number
  ): string[] {
    const queries: string[] = [];
    
    if (round === 1) {
      queries.push(...this.generateRound1Queries(context, originalQuery, role));
    } else {
      queries.push(...this.generateRound2Queries(context, originalQuery, role));
    }

    return this.rankAndFilterQueries(queries);
  }

  /**
   * Extract main topics using keyword extraction and phrase detection
   */
  private extractMainTopics(content: string): string[] {
    const topics: string[] = [];
    
    // Multi-word phrases (likely to be important topics)
    const phrasePatterns = [
      /\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3}\b/g, // Capitalized phrases
      /\b(?:artificial intelligence|machine learning|data science|software development|cloud computing|cyber security)\b/gi,
      /\b[a-z]+ing\s+(?:software|platform|solution|system|tool)\b/gi,
      /\b(?:open source|enterprise|commercial|free)\s+[a-z]+\b/gi
    ];

    phrasePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      topics.push(...matches.map(m => m.toLowerCase().trim()));
    });

    // Single important keywords
    const keywordPatterns = [
      /\b(?:performance|security|scalability|reliability|usability|cost|price|budget|features|functionality)\b/gi,
      /\b(?:python|javascript|java|react|angular|vue|node|docker|kubernetes|aws|azure|gcp)\b/gi,
      /\b(?:database|api|framework|library|service|application|platform|infrastructure)\b/gi
    ];

    keywordPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      topics.push(...matches.map(m => m.toLowerCase().trim()));
    });

    return [...new Set(topics)].slice(0, 10);
  }

  /**
   * Extract named entities (products, companies, technologies, etc.)
   */
  private extractEntities(content: string): string[] {
    const entities: string[] = [];
    
    // Technology/Product names (often capitalized or have specific patterns)
    const entityPatterns = [
      /\b[A-Z][a-zA-Z]*(?:\s+[A-Z][a-zA-Z]*)*(?:\s+\d+(?:\.\d+)*)?(?:\s+[A-Z][a-z]*)?/g, // Generic entities
      /\b(?:GitHub|GitLab|Bitbucket|Jira|Confluence|Slack|Discord|Microsoft|Google|Amazon|Apple|Meta|Tesla)\b/g, // Companies
      /\b(?:VS Code|Visual Studio|IntelliJ|Eclipse|Sublime|Atom|Vim|Emacs)\b/g, // Editors/IDEs
      /\b(?:Chrome|Firefox|Safari|Edge|Opera)\b/g, // Browsers
      /\b(?:Windows|macOS|Linux|Ubuntu|CentOS|RedHat)\b/g, // Operating Systems
      /\b[A-Z][a-z]+(?:\s+[0-9]+(?:\.[0-9]+)*)?(?:\s+(?:Pro|Enterprise|Community|Free|Premium|Standard))?/g // Software versions
    ];

    entityPatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      entities.push(...matches.map(m => m.trim()));
    });

    // URLs and domain names
    const urlPattern = /https?:\/\/[^\s]+|www\.[^\s]+|\b[a-zA-Z0-9-]+\.[a-zA-Z]{2,}\b/g;
    const urls = content.match(urlPattern) || [];
    entities.push(...urls);

    return [...new Set(entities)].slice(0, 15);
  }

  /**
   * Extract sentiment towards specific entities
   */
  private extractSentiments(content: string): Array<{ entity: string; sentiment: 'positive' | 'negative' | 'neutral'; confidence: number }> {
    const sentiments: Array<{ entity: string; sentiment: 'positive' | 'negative' | 'neutral'; confidence: number }> = [];
    
    // Positive sentiment indicators
    const positiveWords = /\b(?:excellent|great|amazing|outstanding|perfect|reliable|efficient|fast|secure|user-friendly|intuitive|powerful|robust|scalable|flexible|cost-effective|affordable|recommended|best|top|leading|superior|innovative|cutting-edge)\b/gi;
    
    // Negative sentiment indicators
    const negativeWords = /\b(?:terrible|awful|poor|bad|slow|unreliable|insecure|expensive|costly|difficult|complex|confusing|problematic|buggy|unstable|outdated|deprecated|limited|restrictive|risky|dangerous)\b/gi;
    
    const entities = this.extractEntities(content);
    
    entities.forEach(entity => {
      // Look for sentiment words near the entity (within 50 characters)
      const entityIndex = content.toLowerCase().indexOf(entity.toLowerCase());
      if (entityIndex !== -1) {
        const contextStart = Math.max(0, entityIndex - 50);
        const contextEnd = Math.min(content.length, entityIndex + entity.length + 50);
        const context = content.slice(contextStart, contextEnd);
        
        const positiveMatches = context.match(positiveWords) || [];
        const negativeMatches = context.match(negativeWords) || [];
        
        if (positiveMatches.length > negativeMatches.length) {
          sentiments.push({
            entity,
            sentiment: 'positive',
            confidence: Math.min(0.9, 0.6 + (positiveMatches.length * 0.1))
          });
        } else if (negativeMatches.length > positiveMatches.length) {
          sentiments.push({
            entity,
            sentiment: 'negative',
            confidence: Math.min(0.9, 0.6 + (negativeMatches.length * 0.1))
          });
        }
      }
    });

    return sentiments.slice(0, 10);
  }

  /**
   * Extract key phrases that are likely to be important for search
   */
  private extractKeyPhrases(content: string): string[] {
    const phrases: string[] = [];
    
    // Important phrase patterns
    const phrasePatterns = [
      /\b(?:in order to|the key to|the main advantage|the primary benefit|the biggest issue|the major problem|the best way to|the most important|the critical factor)\s+[^.!?]+/gi,
      /\b(?:compared to|in contrast to|as opposed to|unlike|versus|vs)\s+[^.!?]+/gi,
      /\b(?:according to|research shows|studies indicate|data suggests|evidence demonstrates)\s+[^.!?]+/gi,
      /\b(?:it's important to note|it's worth mentioning|keep in mind|consider that|bear in mind)\s+[^.!?]+/gi
    ];

    phrasePatterns.forEach(pattern => {
      const matches = content.match(pattern) || [];
      phrases.push(...matches.map(m => m.trim().slice(0, 100))); // Limit phrase length
    });

    return [...new Set(phrases)].slice(0, 8);
  }

  /**
   * Extract questions that might indicate information needs
   */
  private extractQuestions(content: string): string[] {
    const questions: string[] = [];
    
    // Direct questions
    const questionPattern = /[.!?]\s*([A-Z][^.!?]*\?)/g;
    let match;
    while ((match = questionPattern.exec(content)) !== null) {
      questions.push(match[1].trim());
    }

    // Question-like statements
    const implicitQuestions = [
      /\bI wonder\s+[^.!?]+/gi,
      /\bWhat about\s+[^.!?]+/gi,
      /\bHow about\s+[^.!?]+/gi,
      /\bCan we consider\s+[^.!?]+/gi,
      /\bIs it possible\s+[^.!?]+/gi
    ];

    implicitQuestions.forEach(pattern => {
      const matches = content.match(pattern) || [];
      questions.push(...matches.map(m => m.trim() + '?'));
    });

    return [...new Set(questions)].slice(0, 5);
  }

  /**
   * Extract recommendations and suggestions
   */
  private extractRecommendations(content: string): string[] {
    const recommendations: string[] = [];
    
    const recommendationPatterns = [
      /\b(?:I recommend|I suggest|I would suggest|My recommendation|The best choice|I'd go with|Consider|Try)\s+([^.!?]+)/gi,
      /\b([A-Z][^.!?]+)\s+(?:is recommended|is suggested|is the best|would be ideal|is perfect for)/gi,
      /\bYou should\s+([^.!?]+)/gi,
      /\bConsider using\s+([^.!?]+)/gi
    ];

    recommendationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const recommendation = match[1].trim();
        if (recommendation.length > 5 && recommendation.length < 150) {
          recommendations.push(recommendation);
        }
      }
    });

    return [...new Set(recommendations)].slice(0, 8);
  }

  /**
   * Extract criticisms and concerns
   */
  private extractCriticisms(content: string): string[] {
    const criticisms: string[] = [];
    
    const criticismPatterns = [
      /\b(?:However|But|Unfortunately|The problem|The issue|The downside|A major concern|One drawback)\s+([^.!?]+)/gi,
      /\b([^.!?]+)\s+(?:is problematic|has issues|is concerning|is a problem|doesn't work well|fails to)/gi,
      /\bI disagree\s+(?:with|that)\s+([^.!?]+)/gi,
      /\bThe main criticism\s+(?:of|is)\s+([^.!?]+)/gi
    ];

    criticismPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const criticism = match[1].trim();
        if (criticism.length > 5 && criticism.length < 150) {
          criticisms.push(criticism);
        }
      }
    });

    return [...new Set(criticisms)].slice(0, 8);
  }

  /**
   * Extract contested points (areas of disagreement)
   */
  private extractContestedPoints(content: string): string[] {
    const contestedPoints: string[] = [];
    
    const contestationPatterns = [
      /\b(?:That's not true|I disagree|Actually|Contrary to|In fact|On the contrary)\s+([^.!?]+)/gi,
      /\b([^.!?]+)\s+(?:is disputed|is controversial|is debated|is questionable|is uncertain)/gi,
      /\bThere's disagreement\s+(?:about|on|regarding)\s+([^.!?]+)/gi,
      /\bSome argue\s+([^.!?]+)\s+(?:while others|but others|however)/gi
    ];

    contestationPatterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const point = match[1].trim();
        if (point.length > 10 && point.length < 150) {
          contestedPoints.push(point);
        }
      }
    });

    return [...new Set(contestedPoints)].slice(0, 6);
  }

  /**
   * Generate Round 1 search queries based on role and context
   */
  private generateRound1Queries(
    context: ExtractedContext, 
    originalQuery: string, 
    role: 'analyst' | 'critic' | 'synthesizer'
  ): string[] {
    const queries: string[] = [];
    const topTopics = context.mainTopics.slice(0, 3);
    const topEntities = context.entities.slice(0, 3);

    switch (role) {
      case 'analyst':
        // Focus on facts, data, research
        queries.push(
          originalQuery, // Base query
          `${topTopics.join(' ')} research studies data analysis 2024`,
          `${topEntities.join(' ')} comparison benchmarks performance`,
          `best practices ${topTopics.join(' ')} expert recommendations`
        );
        break;

      case 'critic':
        // Focus on problems, limitations, risks
        queries.push(
          `${topTopics.join(' ')} problems issues drawbacks`,
          `${topEntities.join(' ')} negative reviews complaints`,
          `limitations risks ${topTopics.join(' ')} disadvantages`,
          `why ${topTopics.join(' ')} fails problems with`
        );
        break;

      case 'synthesizer':
        // Focus on alternatives, balance, comprehensive views
        queries.push(
          `alternatives to ${topTopics.join(' ')} other options`,
          `${topTopics.join(' ')} comprehensive comparison pros cons`,
          `balanced view ${topTopics.join(' ')} objective analysis`,
          `${topTopics.join(' ')} consensus expert opinions balanced`
        );
        break;
    }

    return queries;
  }

  /**
   * Generate Round 2 search queries based on debate evolution
   */
  private generateRound2Queries(
    context: ExtractedContext, 
    originalQuery: string, 
    role: 'analyst' | 'critic' | 'synthesizer'
  ): string[] {
    const queries: string[] = [];
    const contestedPoints = context.contested_points.slice(0, 2);
    const recommendations = context.recommendations.slice(0, 2);
    const criticisms = context.criticisms.slice(0, 2);

    switch (role) {
      case 'analyst':
        // Search for updated data on contested points
        queries.push(
          ...contestedPoints.map(point => `recent research ${point} 2024 2025`),
          ...recommendations.map(rec => `${rec} latest reviews updated data`),
          `new evidence ${originalQuery} recent findings`
        );
        break;

      case 'critic':
        // Search for counter-evidence and rebuttals
        queries.push(
          ...recommendations.map(rec => `problems with ${rec} criticisms issues`),
          ...contestedPoints.map(point => `counterarguments ${point} rebuttals`),
          `skeptical analysis ${originalQuery} limitations risks`
        );
        break;

      case 'synthesizer':
        // Search for resolution and consensus
        queries.push(
          ...contestedPoints.map(point => `consensus opinion ${point} expert view`),
          `meta analysis ${originalQuery} systematic review`,
          `evidence based recommendations ${originalQuery} best practices`,
          `balanced assessment ${originalQuery} objective comparison`
        );
        break;
    }

    return queries;
  }

  /**
   * Rank and filter search queries by quality and uniqueness
   */
  private rankAndFilterQueries(queries: string[]): string[] {
    // Remove duplicates and very short queries
    const uniqueQueries = [...new Set(queries)]
      .filter(q => q.length > 10)
      .filter(q => q.split(' ').length >= 3); // At least 3 words

    // Score queries based on information content
    const scoredQueries = uniqueQueries.map(query => ({
      query,
      score: this.scoreQuery(query)
    }));

    // Sort by score and return top queries
    return scoredQueries
      .sort((a, b) => b.score - a.score)
      .slice(0, 4) // Limit to top 4 queries
      .map(item => item.query);
  }

  /**
   * Score a query based on its potential information value
   */
  private scoreQuery(query: string): number {
    let score = 0;
    
    // Bonus for recency indicators
    if (/\b(?:2024|2025|recent|latest|new|updated)\b/i.test(query)) score += 2;
    
    // Bonus for specific terms
    if (/\b(?:research|study|analysis|comparison|review|expert|data)\b/i.test(query)) score += 2;
    
    // Bonus for problem/solution focus
    if (/\b(?:problems|issues|solutions|alternatives|best)\b/i.test(query)) score += 1;
    
    // Penalty for very generic terms
    if (/\b(?:good|bad|nice|thing|stuff|information)\b/i.test(query)) score -= 1;
    
    // Bonus for query length (information content)
    score += Math.min(query.split(' ').length / 10, 2);
    
    return score;
  }

  /**
   * Remove duplicates and rank items by frequency/importance
   */
  private deduplicateAndRank(context: ExtractedContext): ExtractedContext {
    return {
      mainTopics: this.deduplicateArray(context.mainTopics).slice(0, 15),
      entities: this.deduplicateArray(context.entities).slice(0, 20),
      sentiments: context.sentiments.slice(0, 15), // Already unique by design
      keyPhrases: this.deduplicateArray(context.keyPhrases).slice(0, 10),
      questions: this.deduplicateArray(context.questions).slice(0, 8),
      recommendations: this.deduplicateArray(context.recommendations).slice(0, 12),
      criticisms: this.deduplicateArray(context.criticisms).slice(0, 12),
      contested_points: this.deduplicateArray(context.contested_points).slice(0, 10)
    };
  }

  /**
   * Remove duplicates from an array (case-insensitive)
   */
  private deduplicateArray(arr: string[]): string[] {
    const seen = new Set<string>();
    return arr.filter(item => {
      const normalized = item.toLowerCase().trim();
      if (seen.has(normalized)) {
        return false;
      }
      seen.add(normalized);
      return true;
    });
  }
}

// Singleton instance
let contextExtractor: ContextExtractor | null = null;

export function getContextExtractor(): ContextExtractor {
  if (!contextExtractor) {
    contextExtractor = new ContextExtractor();
  }
  return contextExtractor;
}