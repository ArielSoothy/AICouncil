export class FormattingService {
  /**
   * Format time from Date object
   */
  static formatTime(date: Date): string {
    return new Date(date).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  }
  
  /**
   * Format duration between two dates
   */
  static formatDuration(start: Date, end?: Date): string {
    if (!end) return 'In progress...'
    const duration = new Date(end).getTime() - new Date(start).getTime()
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}m ${remainingSeconds}s`
  }
  
  /**
   * Check if message is long (for truncation)
   */
  static isLongMessage(content: string): boolean {
    return content.length > 800 || content.split('\n').length > 12
  }
  
  /**
   * Truncate text while respecting sentence boundaries
   */
  static truncateAtSentence(content: string, maxLength: number = 600): string {
    if (content.length <= maxLength) return content
    
    // Split into sentences using proper sentence endings
    const sentences = content.split(/(?<=[.!?])\s+/).filter(s => s.trim().length > 0)
    let truncated = ''
    
    // Take complete sentences up to maxLength characters
    for (const sentence of sentences) {
      const nextLength = (truncated + sentence).length
      // Only add if it fits comfortably or if we haven't added any sentences yet
      if (nextLength <= maxLength || truncated.length === 0) {
        truncated += (truncated ? ' ' : '') + sentence
      } else {
        break
      }
    }
    
    // If no sentences fit, take first maxLength chars and find last complete word
    if (truncated.length === 0) {
      const firstChunk = content.substring(0, maxLength)
      const lastSpace = firstChunk.lastIndexOf(' ')
      truncated = lastSpace > 0 ? firstChunk.substring(0, lastSpace) : firstChunk
    }
    
    return truncated + (truncated.length < content.length ? '...' : '')
  }
  
  /**
   * Generate unique message ID
   */
  static getMessageId(agentId: string, round: number, timestamp: Date): string {
    return `${agentId}-${round}-${timestamp.getTime()}`
  }
  
  /**
   * Format number with locale-specific separators
   */
  static formatNumber(num: number): string {
    return num.toLocaleString()
  }
  
  /**
   * Format currency with proper decimals
   */
  static formatCurrency(amount: number, decimals: number = 4): string {
    return `$${amount.toFixed(decimals)}`
  }
  
  /**
   * Calculate estimated line count for text
   */
  static estimateLineCount(content: string, charsPerLine: number = 100): number {
    return Math.ceil(content.length / charsPerLine)
  }
  
  /**
   * Extract first paragraph from content
   */
  static extractFirstParagraph(content: string): string {
    return content.split('\n\n')[0] || content.split('\n')[0] || content
  }
  
  /**
   * Clean up context text to end at complete word
   */
  static cleanContextEnd(context: string): string {
    const lastSpace = context.lastIndexOf(' ')
    if (lastSpace > context.length - 20) {
      return context.slice(0, lastSpace) + '...'
    }
    return context
  }
  
  /**
   * Format agent name with fallbacks
   */
  static formatAgentName(agent: any): string {
    return agent?.name || agent?.persona?.name || agent?.model || 'Unknown Agent'
  }
  
  /**
   * Format agent role display
   */
  static formatAgentRole(agent: any): string {
    const name = this.formatAgentName(agent)
    const role = agent?.role || agent?.persona?.role || ''
    return role ? `${name} (${role})` : name
  }
}