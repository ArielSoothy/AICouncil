'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronDown, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { ResearchReport } from '@/types/research-agents';

interface ResearchActivityPanelProps {
  research: ResearchReport | null;
  isLoading?: boolean;
}

interface AgentCardProps {
  agent: {
    name: string;
    emoji: string;
    data: any;
    description: string;
  };
}

/**
 * Individual Agent Card with Expandable Details
 */
function AgentCard({ agent }: AgentCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Guard against undefined agent.data
  if (!agent.data) {
    return (
      <div className="border rounded-lg p-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agent.emoji}</span>
          <div className="text-left">
            <div className="font-medium">{agent.name}</div>
            <div className="text-xs text-muted-foreground">
              {agent.description}
            </div>
          </div>
          <div className="ml-auto text-xs text-muted-foreground">
            No data available
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{agent.emoji}</span>
            <div className="text-left">
              <div className="font-medium">{agent.name}</div>
              <div className="text-xs text-muted-foreground">
                {agent.description}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {agent.data.error ? (
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">Failed</span>
              </div>
            ) : (
              <>
                <div className="text-right">
                  <div className="text-sm font-semibold">
                    {agent.data.toolCallCount} tools
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {(agent.data.responseTime / 1000).toFixed(1)}s
                  </div>
                </div>
                <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
              </>
            )}
            <ChevronDown
              className={`h-4 w-4 text-muted-foreground transition-transform ${
                isExpanded ? 'rotate-180' : ''
              }`}
            />
          </div>
        </div>
      </button>

      {isExpanded && (
        <div className="p-4 pt-0">
          <div className="mt-2 space-y-3 bg-muted/50 rounded-lg p-4">
            {/* Tool Details */}
            {agent.data.toolCallCount > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2">
                  Tools Used ({agent.data.toolCallCount}):
                </div>
                <div className="flex flex-wrap gap-2">
                  {agent.data.toolNames.map((tool: string, idx: number) => (
                    <span
                      key={idx}
                      className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded"
                    >
                      🔧 {tool}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Research Findings Preview */}
            <div>
              <div className="text-xs font-semibold mb-2">Findings:</div>
              <div className="text-sm text-muted-foreground bg-white dark:bg-gray-900 rounded p-3 max-h-40 overflow-y-auto">
                {agent.data.findings.substring(0, 500)}
                {agent.data.findings.length > 500 && '...'}
              </div>
            </div>

            {/* Error Message */}
            {agent.data.error && (
              <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 rounded p-3">
                <strong>Error:</strong> {agent.data.error}
              </div>
            )}

            {/* Performance Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                <div className="font-semibold">
                  {agent.data.model.split('-')[0]}
                </div>
                <div className="text-muted-foreground">Model</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                <div className="font-semibold">
                  {agent.data.tokensUsed}
                </div>
                <div className="text-muted-foreground">Tokens</div>
              </div>
              <div className="text-center p-2 bg-white dark:bg-gray-900 rounded">
                <div className="font-semibold">
                  {(agent.data.responseTime / 1000).toFixed(1)}s
                </div>
                <div className="text-muted-foreground">Time</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Research Activity Panel - Phase 4 UI Enhancement
 *
 * Displays detailed breakdown of exhaustive research pipeline:
 * - 4 specialized research agents (Technical, Fundamental, Sentiment, Risk)
 * - Tool usage statistics per agent
 * - Research duration and performance metrics
 * - Expandable research findings for each agent
 *
 * Philosophy: Transparency in "real money" decision-making process
 */
export function ResearchActivityPanel({
  research,
  isLoading = false,
}: ResearchActivityPanelProps) {
  if (!research && !isLoading) {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="border-blue-200 dark:border-blue-800">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 animate-spin" />
            🔬 Research Pipeline Running...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            4 specialized agents conducting exhaustive market research...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!research) return null;

  const agents = [
    {
      name: 'Technical Analyst',
      emoji: '📊',
      data: research.technical,
      description: 'Price action, momentum, trend analysis',
    },
    {
      name: 'Fundamental Analyst',
      emoji: '📈',
      data: research.fundamental,
      description: 'Company financials, earnings, news',
    },
    {
      name: 'Sentiment Analyst',
      emoji: '💭',
      data: research.sentiment,
      description: 'Market psychology, news sentiment',
    },
    {
      name: 'Risk Manager',
      emoji: '🛡️',
      data: research.risk,
      description: 'Position sizing, risk assessment',
    },
  ];

  const totalTools = research.totalToolCalls;
  const duration = (research.researchDuration / 1000).toFixed(1);

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
            🔬 Research Pipeline Complete
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            {duration}s • {totalTools} tool calls
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Research Summary Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-white dark:bg-gray-900 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {totalTools}
            </div>
            <div className="text-xs text-muted-foreground">Total API Calls</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {duration}s
            </div>
            <div className="text-xs text-muted-foreground">Duration</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              4
            </div>
            <div className="text-xs text-muted-foreground">Research Agents</div>
          </div>
        </div>

        {/* Individual Agent Cards */}
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">Agent Activity:</h4>
          {agents.map((agent) => (
            <AgentCard key={agent.name} agent={agent} />
          ))}
        </div>

        {/* Research Quality Indicator */}
        <div className="pt-4 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Research Completeness:</span>
            <span className="text-sm font-semibold">
              {Math.round((totalTools / 40) * 100)}%
            </span>
          </div>
          <Progress value={(totalTools / 40) * 100} className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {totalTools < 20
              ? '⚠️ Limited research - consider adding more agents'
              : totalTools < 30
              ? '✅ Good research coverage'
              : '🌟 Exhaustive research - high confidence'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
