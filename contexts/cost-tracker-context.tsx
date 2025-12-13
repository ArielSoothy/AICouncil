'use client';

/**
 * Cost Tracker Context
 *
 * Provides app-wide cost tracking and estimation.
 * All costs use real pricing from lib/model-metadata.ts
 */

import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import type {
  CostTrackerState,
  CostTrackerContextValue,
  CostRecord,
  CostEstimate,
  AnalysisType,
  AnalysisSession,
  TrackUsageInput,
} from '@/types/cost-tracking';
import {
  calculateCost,
  initializeSession,
  addRecordToSession,
  getSessionSummary,
  resetSession,
  getTodayTotals,
  incrementAnalysisCount,
} from '@/lib/services/cost-tracker';

// ============================================================================
// State & Actions
// ============================================================================

type CostTrackerAction =
  | { type: 'SET_ESTIMATE'; payload: CostEstimate | null }
  | { type: 'START_ANALYSIS'; payload: { type: AnalysisType; context?: string } }
  | { type: 'END_ANALYSIS'; payload: { status: 'completed' | 'error' } }
  | { type: 'ADD_RECORD'; payload: CostRecord }
  | { type: 'CLEAR_SESSION' }
  | { type: 'TOGGLE_FOOTER' }
  | { type: 'SET_FOOTER_VISIBLE'; payload: boolean }
  | { type: 'RESTORE_SESSION'; payload: { sessionTotal: number; sessionTokens: number; analysisCount: number; todayTotal: number; todayTokens: number } };

const initialState: CostTrackerState = {
  currentAnalysis: null,
  estimatedCost: null,
  sessionTotal: 0,
  sessionTokens: 0,
  sessionStartTime: new Date(),
  analysisCount: 0,
  todayTotal: 0,
  todayTokens: 0,
  isFooterExpanded: false,
  isFooterVisible: true,
};

function costTrackerReducer(state: CostTrackerState, action: CostTrackerAction): CostTrackerState {
  switch (action.type) {
    case 'SET_ESTIMATE':
      return { ...state, estimatedCost: action.payload };

    case 'START_ANALYSIS': {
      const newAnalysis: AnalysisSession = {
        id: `analysis-${Date.now()}`,
        startTime: new Date(),
        analysisType: action.payload.type,
        records: [],
        totalTokens: 0,
        totalCost: 0,
        status: 'running',
        context: action.payload.context,
      };
      return { ...state, currentAnalysis: newAnalysis };
    }

    case 'END_ANALYSIS': {
      if (!state.currentAnalysis) return state;
      const endedAnalysis: AnalysisSession = {
        ...state.currentAnalysis,
        endTime: new Date(),
        status: action.payload.status,
      };
      return {
        ...state,
        currentAnalysis: null,
        sessionTotal: state.sessionTotal + endedAnalysis.totalCost,
        sessionTokens: state.sessionTokens + endedAnalysis.totalTokens,
        analysisCount: state.analysisCount + 1,
      };
    }

    case 'ADD_RECORD': {
      const record = action.payload;
      if (!state.currentAnalysis) {
        // No active analysis, just update session totals
        return {
          ...state,
          sessionTotal: state.sessionTotal + record.cost,
          sessionTokens: state.sessionTokens + record.tokens.total,
        };
      }
      // Add to current analysis
      const updatedAnalysis: AnalysisSession = {
        ...state.currentAnalysis,
        records: [...state.currentAnalysis.records, record],
        totalTokens: state.currentAnalysis.totalTokens + record.tokens.total,
        totalCost: state.currentAnalysis.totalCost + record.cost,
      };
      return { ...state, currentAnalysis: updatedAnalysis };
    }

    case 'CLEAR_SESSION':
      return {
        ...state,
        currentAnalysis: null,
        estimatedCost: null,
        sessionTotal: 0,
        sessionTokens: 0,
        sessionStartTime: new Date(),
        analysisCount: 0,
      };

    case 'TOGGLE_FOOTER':
      return { ...state, isFooterExpanded: !state.isFooterExpanded };

    case 'SET_FOOTER_VISIBLE':
      return { ...state, isFooterVisible: action.payload };

    case 'RESTORE_SESSION':
      return {
        ...state,
        sessionTotal: action.payload.sessionTotal,
        sessionTokens: action.payload.sessionTokens,
        analysisCount: action.payload.analysisCount,
        todayTotal: action.payload.todayTotal,
        todayTokens: action.payload.todayTokens,
      };

    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const CostTrackerContext = createContext<CostTrackerContextValue | null>(null);

export function CostTrackerProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(costTrackerReducer, initialState);

  // Initialize session on mount
  useEffect(() => {
    const session = initializeSession();
    const today = getTodayTotals();

    dispatch({
      type: 'RESTORE_SESSION',
      payload: {
        sessionTotal: session.totalCost,
        sessionTokens: session.totalTokens,
        analysisCount: session.analysisCount,
        todayTotal: today.cost,
        todayTokens: today.tokens,
      },
    });
  }, []);

  // Track usage
  const trackUsage = useCallback(
    (record: TrackUsageInput) => {
      const fullRecord: CostRecord = {
        ...record,
        id: `record-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        cost: record.cost ?? calculateCost(record.modelId, record.tokens),
      };

      dispatch({ type: 'ADD_RECORD', payload: fullRecord });
      addRecordToSession(fullRecord);
    },
    []
  );

  // Start analysis
  const startAnalysis = useCallback((type: AnalysisType, context?: string) => {
    dispatch({ type: 'START_ANALYSIS', payload: { type, context } });
  }, []);

  // End analysis
  const endAnalysis = useCallback((status: 'completed' | 'error' = 'completed') => {
    dispatch({ type: 'END_ANALYSIS', payload: { status } });
    incrementAnalysisCount();
  }, []);

  // Update estimate
  const updateEstimate = useCallback((estimate: CostEstimate) => {
    dispatch({ type: 'SET_ESTIMATE', payload: estimate });
  }, []);

  // Clear session
  const clearSession = useCallback(() => {
    resetSession();
    dispatch({ type: 'CLEAR_SESSION' });
  }, []);

  // Toggle footer
  const toggleFooter = useCallback(() => {
    dispatch({ type: 'TOGGLE_FOOTER' });
  }, []);

  // Set footer visible
  const setFooterVisible = useCallback((visible: boolean) => {
    dispatch({ type: 'SET_FOOTER_VISIBLE', payload: visible });
  }, []);

  // Get current analysis cost
  const getCurrentAnalysisCost = useCallback(() => {
    return state.currentAnalysis?.totalCost || 0;
  }, [state.currentAnalysis]);

  // Get session breakdown
  const getSessionBreakdown = useCallback(() => {
    const summary = getSessionSummary();
    return {
      byModel: summary.byModel,
      byProvider: summary.byProvider,
    };
  }, []);

  const value: CostTrackerContextValue = {
    state,
    trackUsage,
    startAnalysis,
    endAnalysis,
    updateEstimate,
    clearSession,
    toggleFooter,
    setFooterVisible,
    getCurrentAnalysisCost,
    getSessionBreakdown,
  };

  return (
    <CostTrackerContext.Provider value={value}>
      {children}
    </CostTrackerContext.Provider>
  );
}

export function useCostTracker(): CostTrackerContextValue {
  const context = useContext(CostTrackerContext);
  if (!context) {
    throw new Error('useCostTracker must be used within a CostTrackerProvider');
  }
  return context;
}

// Export a hook for optional use (doesn't throw if context is missing)
export function useCostTrackerOptional(): CostTrackerContextValue | null {
  return useContext(CostTrackerContext);
}
