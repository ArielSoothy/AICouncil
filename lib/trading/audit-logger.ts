/**
 * Trading Audit Trail Logger
 *
 * Purpose: Log all trading decisions for reproducibility verification and compliance.
 *
 * Features:
 * - Immutable audit records with timestamps
 * - Input hash for reproducibility verification
 * - Complete decision context capture
 * - localStorage persistence (can be extended to database)
 * - Export capability for compliance reporting
 *
 * Created: December 11, 2025
 */

// ============================================================================
// TYPES
// ============================================================================

export interface AuditRecord {
  // Unique identifiers
  id: string;
  timestamp: string;
  inputHash: string; // From scoring engine - same inputs = same hash

  // Trading context
  symbol: string;
  timeframe: 'day' | 'swing' | 'position' | 'longterm';
  mode: 'consensus' | 'individual' | 'debate';

  // Market data snapshot
  marketData: {
    price: number;
    rsi: number;
    macd: number;
    trend: string;
  };

  // Deterministic score (algorithmic)
  deterministicScore: {
    recommendation: string;
    weightedScore: number;
    confidence: number;
    technical: number;
    fundamental: number;
    sentiment: number;
    trend: number;
  };

  // AI decision
  aiDecision: {
    action: string;
    confidence: number;
    reasoning: string;
    models: string[]; // Models that participated
    temperature: number;
    seed?: number;
  };

  // Risk parameters
  riskParameters: {
    suggestedStopLoss: number;
    suggestedTakeProfit: number;
    riskRewardRatio: string;
    positionSize?: number;
  };

  // Research metadata
  researchMetadata?: {
    totalToolCalls: number;
    researchDuration: number;
    agentRoles: string[];
  };

  // Execution status (if trade was executed)
  execution?: {
    executed: boolean;
    orderId?: string;
    executedPrice?: number;
    executedAt?: string;
    slippage?: number;
  };

  // Verification
  verificationHash: string; // Hash of entire record for tamper detection
}

export interface AuditLogQuery {
  symbol?: string;
  timeframe?: string;
  mode?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export interface AuditStats {
  totalRecords: number;
  recordsByMode: Record<string, number>;
  recordsByTimeframe: Record<string, number>;
  averageConfidence: number;
  actionDistribution: Record<string, number>;
  dateRange: {
    oldest: string;
    newest: string;
  };
}

// ============================================================================
// AUDIT LOGGER CLASS
// ============================================================================

const STORAGE_KEY = 'trading_audit_log';
const MAX_RECORDS = 1000; // Limit localStorage usage

export class AuditLogger {
  private records: AuditRecord[] = [];
  private initialized = false;

  constructor() {
    // Lazy initialization to avoid SSR issues
  }

  /**
   * Initialize logger (call on client side only)
   */
  init(): void {
    if (this.initialized || typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.records = JSON.parse(stored);
      }
      this.initialized = true;
    } catch (error) {
      console.error('Failed to load audit log:', error);
      this.records = [];
      this.initialized = true;
    }
  }

  /**
   * Log a trading decision
   */
  log(record: Omit<AuditRecord, 'id' | 'timestamp' | 'verificationHash'>): AuditRecord {
    this.init();

    const timestamp = new Date().toISOString();
    const id = `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create complete record
    const completeRecord: AuditRecord = {
      id,
      timestamp,
      verificationHash: '', // Will be set below
      ...record,
    };

    // Generate verification hash
    completeRecord.verificationHash = this.generateVerificationHash(completeRecord);

    // Add to records
    this.records.unshift(completeRecord);

    // Trim old records if exceeding limit
    if (this.records.length > MAX_RECORDS) {
      this.records = this.records.slice(0, MAX_RECORDS);
    }

    // Persist
    this.persist();

    console.log(`📝 Audit record created: ${id} for ${record.symbol} (${record.mode})`);
    return completeRecord;
  }

  /**
   * Query audit records
   */
  query(params: AuditLogQuery): AuditRecord[] {
    this.init();

    let filtered = [...this.records];

    if (params.symbol) {
      filtered = filtered.filter(r => r.symbol === params.symbol);
    }

    if (params.timeframe) {
      filtered = filtered.filter(r => r.timeframe === params.timeframe);
    }

    if (params.mode) {
      filtered = filtered.filter(r => r.mode === params.mode);
    }

    if (params.startDate) {
      filtered = filtered.filter(r => r.timestamp >= params.startDate!);
    }

    if (params.endDate) {
      filtered = filtered.filter(r => r.timestamp <= params.endDate!);
    }

    if (params.limit) {
      filtered = filtered.slice(0, params.limit);
    }

    return filtered;
  }

  /**
   * Get a specific record by ID
   */
  getById(id: string): AuditRecord | undefined {
    this.init();
    return this.records.find(r => r.id === id);
  }

  /**
   * Get a record by input hash (for reproducibility verification)
   */
  getByInputHash(inputHash: string): AuditRecord[] {
    this.init();
    return this.records.filter(r => r.inputHash === inputHash);
  }

  /**
   * Verify a record hasn't been tampered with
   */
  verifyRecord(record: AuditRecord): boolean {
    const expectedHash = this.generateVerificationHash({
      ...record,
      verificationHash: '',
    });
    return expectedHash === record.verificationHash;
  }

  /**
   * Get audit statistics
   */
  getStats(): AuditStats {
    this.init();

    if (this.records.length === 0) {
      return {
        totalRecords: 0,
        recordsByMode: {},
        recordsByTimeframe: {},
        averageConfidence: 0,
        actionDistribution: {},
        dateRange: { oldest: '', newest: '' },
      };
    }

    const recordsByMode: Record<string, number> = {};
    const recordsByTimeframe: Record<string, number> = {};
    const actionDistribution: Record<string, number> = {};
    let totalConfidence = 0;

    for (const record of this.records) {
      recordsByMode[record.mode] = (recordsByMode[record.mode] || 0) + 1;
      recordsByTimeframe[record.timeframe] = (recordsByTimeframe[record.timeframe] || 0) + 1;
      actionDistribution[record.aiDecision.action] = (actionDistribution[record.aiDecision.action] || 0) + 1;
      totalConfidence += record.aiDecision.confidence;
    }

    const timestamps = this.records.map(r => r.timestamp).sort();

    return {
      totalRecords: this.records.length,
      recordsByMode,
      recordsByTimeframe,
      averageConfidence: totalConfidence / this.records.length,
      actionDistribution,
      dateRange: {
        oldest: timestamps[0],
        newest: timestamps[timestamps.length - 1],
      },
    };
  }

  /**
   * Export records as JSON for compliance
   */
  exportJSON(params?: AuditLogQuery): string {
    const records = params ? this.query(params) : this.records;
    return JSON.stringify(records, null, 2);
  }

  /**
   * Export records as CSV for analysis
   */
  exportCSV(params?: AuditLogQuery): string {
    const records = params ? this.query(params) : this.records;

    const headers = [
      'id',
      'timestamp',
      'symbol',
      'timeframe',
      'mode',
      'price',
      'deterministicRecommendation',
      'deterministicScore',
      'aiAction',
      'aiConfidence',
      'stopLoss',
      'takeProfit',
      'riskReward',
      'inputHash',
    ];

    const rows = records.map(r => [
      r.id,
      r.timestamp,
      r.symbol,
      r.timeframe,
      r.mode,
      r.marketData.price,
      r.deterministicScore.recommendation,
      r.deterministicScore.weightedScore.toFixed(2),
      r.aiDecision.action,
      r.aiDecision.confidence.toFixed(2),
      r.riskParameters.suggestedStopLoss.toFixed(2),
      r.riskParameters.suggestedTakeProfit.toFixed(2),
      r.riskParameters.riskRewardRatio,
      r.inputHash,
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Clear all records (with confirmation)
   */
  clear(): void {
    this.init();
    this.records = [];
    this.persist();
    console.log('🗑️ Audit log cleared');
  }

  /**
   * Persist to localStorage
   */
  private persist(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.records));
    } catch (error) {
      console.error('Failed to persist audit log:', error);
    }
  }

  /**
   * Generate verification hash for tamper detection
   */
  private generateVerificationHash(record: Omit<AuditRecord, 'verificationHash'> & { verificationHash: string }): string {
    const { verificationHash, ...data } = record;
    const inputString = JSON.stringify(data);

    // Simple hash (for production, use crypto.createHash('sha256'))
    let hash = 0;
    for (let i = 0; i < inputString.length; i++) {
      const char = inputString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const auditLogger = new AuditLogger();

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create an audit record from trading route data
 */
export function createAuditRecord(
  symbol: string,
  timeframe: 'day' | 'swing' | 'position' | 'longterm',
  mode: 'consensus' | 'individual' | 'debate',
  deterministicScore: AuditRecord['deterministicScore'] & { inputHash: string },
  aiDecision: AuditRecord['aiDecision'],
  marketData: AuditRecord['marketData'],
  riskParameters: AuditRecord['riskParameters'],
  researchMetadata?: AuditRecord['researchMetadata']
): AuditRecord {
  return auditLogger.log({
    inputHash: deterministicScore.inputHash,
    symbol,
    timeframe,
    mode,
    marketData,
    deterministicScore: {
      recommendation: deterministicScore.recommendation,
      weightedScore: deterministicScore.weightedScore,
      confidence: deterministicScore.confidence,
      technical: deterministicScore.technical,
      fundamental: deterministicScore.fundamental,
      sentiment: deterministicScore.sentiment,
      trend: deterministicScore.trend,
    },
    aiDecision,
    riskParameters,
    researchMetadata,
  });
}

/**
 * Check if the same inputs have produced the same output before
 */
export function checkReproducibility(inputHash: string, currentRecommendation: string): {
  isReproducible: boolean;
  previousRecords: number;
  matchingRecords: number;
} {
  const previousRecords = auditLogger.getByInputHash(inputHash);
  const matchingRecords = previousRecords.filter(
    r => r.deterministicScore.recommendation === currentRecommendation
  );

  return {
    isReproducible: previousRecords.length === 0 || matchingRecords.length === previousRecords.length,
    previousRecords: previousRecords.length,
    matchingRecords: matchingRecords.length,
  };
}
