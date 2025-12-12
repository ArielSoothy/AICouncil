/**
 * Research Progress Component
 *
 * Visual display of research agents and tools being used during trading analysis.
 * Shows real-time progress with expandable details.
 *
 * Features:
 * - Compact card view for each research agent
 * - Expandable details showing tool calls
 * - Progress indicators during research
 * - Color-coded status (pending/active/complete)
 *
 * Created: December 11, 2025
 */

'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench,
  TrendingUp,
  FileText,
  MessageSquare,
  Shield,
  Database,
  BarChart3,
  Newspaper,
  Calculator,
  AlertTriangle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ResearchAgentProgress {
  role: 'technical' | 'fundamental' | 'sentiment' | 'risk';
  model: string;
  status: 'pending' | 'active' | 'complete' | 'error';
  toolsUsed: number;
  tools: string[];
  findings?: string;
  duration?: number; // ms
}

export interface ResearchProgressData {
  status: 'idle' | 'researching' | 'complete' | 'error';
  totalToolCalls: number;
  researchDuration: number; // ms
  agents: ResearchAgentProgress[];
  symbol?: string;
  timeframe?: string;
}

interface ResearchProgressProps {
  data: ResearchProgressData | null;
  className?: string;
  defaultExpanded?: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getAgentIcon(role: string) {
  switch (role) {
    case 'technical':
      return TrendingUp;
    case 'fundamental':
      return FileText;
    case 'sentiment':
      return MessageSquare;
    case 'risk':
      return Shield;
    default:
      return Database;
  }
}

function getAgentColor(role: string) {
  switch (role) {
    case 'technical':
      return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
    case 'fundamental':
      return 'text-green-600 bg-green-100 dark:bg-green-900/30';
    case 'sentiment':
      return 'text-purple-600 bg-purple-100 dark:bg-purple-900/30';
    case 'risk':
      return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
    default:
      return 'text-gray-600 bg-gray-100 dark:bg-gray-900/30';
  }
}

function getAgentLabel(role: string) {
  switch (role) {
    case 'technical':
      return 'Technical Analysis';
    case 'fundamental':
      return 'Fundamental Analysis';
    case 'sentiment':
      return 'Sentiment Analysis';
    case 'risk':
      return 'Risk Assessment';
    default:
      return role;
  }
}

function getToolIcon(toolName: string) {
  const name = toolName.toLowerCase();
  if (name.includes('rsi') || name.includes('macd') || name.includes('indicator')) return Calculator;
  if (name.includes('news') || name.includes('headline')) return Newspaper;
  if (name.includes('price') || name.includes('quote')) return BarChart3;
  if (name.includes('support') || name.includes('resistance')) return TrendingUp;
  if (name.includes('fundamental') || name.includes('earnings')) return FileText;
  if (name.includes('risk') || name.includes('volatility')) return AlertTriangle;
  return Wrench;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ============================================================================
// AGENT CARD COMPONENT
// ============================================================================

interface AgentCardProps {
  agent: ResearchAgentProgress;
  defaultExpanded?: boolean;
}

function AgentCard({ agent, defaultExpanded = false }: AgentCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const Icon = getAgentIcon(agent.role);
  const colorClass = getAgentColor(agent.role);

  const statusIcon = {
    pending: <Clock className="w-4 h-4 text-gray-400" />,
    active: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />,
    complete: <CheckCircle2 className="w-4 h-4 text-green-500" />,
    error: <AlertTriangle className="w-4 h-4 text-red-500" />,
  };

  return (
    <div
      className={cn(
        'border rounded-lg overflow-hidden transition-all duration-200',
        agent.status === 'active' && 'ring-2 ring-blue-400 ring-opacity-50',
        agent.status === 'complete' && 'border-green-300 dark:border-green-700',
        agent.status === 'error' && 'border-red-300 dark:border-red-700'
      )}
    >
      {/* Header - Always visible */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          'w-full flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors',
          colorClass.split(' ')[1]
        )}
      >
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', colorClass)}>
            <Icon className="w-4 h-4" />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">{getAgentLabel(agent.role)}</div>
            <div className="text-xs text-muted-foreground">{agent.model}</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Tool count badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800">
            <Wrench className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs font-medium">
              {agent.toolsUsed} {agent.toolsUsed === 1 ? 'tool' : 'tools'}
            </span>
          </div>

          {/* Status indicator */}
          {statusIcon[agent.status]}

          {/* Expand/collapse icon */}
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t p-3 bg-gray-50/50 dark:bg-gray-900/50">
          {/* Tools used */}
          {agent.tools.length > 0 && (
            <div className="mb-3">
              <div className="text-xs font-medium text-muted-foreground mb-2">Tools Used:</div>
              <div className="flex flex-wrap gap-1.5">
                {agent.tools.map((tool, idx) => {
                  const ToolIcon = getToolIcon(tool);
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-800 border text-xs"
                    >
                      <ToolIcon className="w-3 h-3 text-muted-foreground" />
                      <span>{tool}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Duration */}
          {agent.duration && (
            <div className="text-xs text-muted-foreground">
              Duration: {formatDuration(agent.duration)}
            </div>
          )}

          {/* Findings preview (if available) */}
          {agent.findings && (
            <div className="mt-2">
              <div className="text-xs font-medium text-muted-foreground mb-1">Key Findings:</div>
              <div className="text-xs text-gray-700 dark:text-gray-300 line-clamp-3 bg-white dark:bg-gray-800 p-2 rounded border">
                {agent.findings.slice(0, 200)}...
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ResearchProgress({ data, className, defaultExpanded = false }: ResearchProgressProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!data) {
    return null;
  }

  const { status, totalToolCalls, researchDuration, agents, symbol, timeframe } = data;

  // Status display
  const statusDisplay = {
    idle: { label: 'Ready', icon: Clock, color: 'text-gray-500' },
    researching: { label: 'Researching...', icon: Loader2, color: 'text-blue-500' },
    complete: { label: 'Complete', icon: CheckCircle2, color: 'text-green-500' },
    error: { label: 'Error', icon: AlertTriangle, color: 'text-red-500' },
  };

  const StatusIcon = statusDisplay[status].icon;

  return (
    <div className={cn('rounded-lg border bg-card', className)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
            <Database className="w-5 h-5 text-blue-600" />
          </div>
          <div className="text-left">
            <div className="font-semibold">Research Pipeline</div>
            <div className="text-sm text-muted-foreground">
              {symbol && `${symbol} `}
              {timeframe && `(${timeframe})`}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Summary stats */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1.5">
              <Wrench className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{totalToolCalls} tools</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="font-medium">{formatDuration(researchDuration)}</span>
            </div>
          </div>

          {/* Status badge */}
          <div
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium',
              status === 'researching' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300',
              status === 'complete' && 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300',
              status === 'error' && 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
              status === 'idle' && 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
            )}
          >
            <StatusIcon className={cn('w-4 h-4', status === 'researching' && 'animate-spin')} />
            {statusDisplay[status].label}
          </div>

          {/* Expand icon */}
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Agents grid */}
      {isExpanded && (
        <div className="p-4 pt-0 grid gap-3 sm:grid-cols-2">
          {agents.map((agent) => (
            <AgentCard key={agent.role} agent={agent} defaultExpanded={defaultExpanded} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// COMPACT VERSION (for inline display)
// ============================================================================

interface ResearchProgressCompactProps {
  data: ResearchProgressData | null;
  className?: string;
}

export function ResearchProgressCompact({ data, className }: ResearchProgressCompactProps) {
  if (!data) return null;

  const { status, totalToolCalls, researchDuration, agents } = data;
  const activeAgent = agents.find((a) => a.status === 'active');
  const completedCount = agents.filter((a) => a.status === 'complete').length;

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2 rounded-lg border bg-card text-sm',
        className
      )}
    >
      {status === 'researching' ? (
        <>
          <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-muted-foreground">
            {activeAgent ? `${getAgentLabel(activeAgent.role)}...` : 'Researching...'}
          </span>
          <span className="text-xs text-muted-foreground">
            ({completedCount}/{agents.length} agents)
          </span>
        </>
      ) : status === 'complete' ? (
        <>
          <CheckCircle2 className="w-4 h-4 text-green-500" />
          <span className="font-medium">{totalToolCalls} tools used</span>
          <span className="text-muted-foreground">in {formatDuration(researchDuration)}</span>
        </>
      ) : (
        <>
          <Clock className="w-4 h-4 text-gray-400" />
          <span className="text-muted-foreground">Ready to research</span>
        </>
      )}
    </div>
  );
}

// ============================================================================
// HOOK FOR REAL-TIME UPDATES
// ============================================================================

export function useResearchProgress(initialData?: ResearchProgressData) {
  const [data, setData] = useState<ResearchProgressData | null>(initialData || null);

  const updateAgent = (role: string, updates: Partial<ResearchAgentProgress>) => {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        agents: prev.agents.map((agent) =>
          agent.role === role ? { ...agent, ...updates } : agent
        ),
      };
    });
  };

  const setStatus = (status: ResearchProgressData['status']) => {
    setData((prev) => (prev ? { ...prev, status } : prev));
  };

  const reset = () => {
    setData({
      status: 'idle',
      totalToolCalls: 0,
      researchDuration: 0,
      agents: [
        { role: 'technical', model: '', status: 'pending', toolsUsed: 0, tools: [] },
        { role: 'fundamental', model: '', status: 'pending', toolsUsed: 0, tools: [] },
        { role: 'sentiment', model: '', status: 'pending', toolsUsed: 0, tools: [] },
        { role: 'risk', model: '', status: 'pending', toolsUsed: 0, tools: [] },
      ],
    });
  };

  return { data, setData, updateAgent, setStatus, reset };
}
