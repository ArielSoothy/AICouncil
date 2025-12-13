'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Copy, Check, ExternalLink, Database, Cpu, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  RESEARCH_AGENTS,
  DATA_SOURCES,
  TOOL_DEFINITIONS,
  RESEARCH_STATS,
  type ResearchAgent,
  type DataPoint,
} from '@/lib/config/research-taxonomy'

/**
 * Research Taxonomy View
 *
 * Visual representation of the entire research data pipeline:
 * - 4 Research Agents (Technical, Fundamental, Sentiment, Risk)
 * - 11 Tools each agent can use
 * - Data points collected
 * - Data sources (Yahoo, IBKR, Alpaca, SEC EDGAR)
 */

interface ToolDetailModalProps {
  toolId: string
  onClose: () => void
}

function ToolDetailModal({ toolId, onClose }: ToolDetailModalProps) {
  const tool = TOOL_DEFINITIONS[toolId]
  if (!tool) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-gray-900 border border-gray-700 rounded-lg p-6 max-w-lg w-full mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h3 className="text-lg font-semibold text-white">{tool.name}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            &times;
          </button>
        </div>

        <div className="space-y-4 text-sm">
          <div>
            <span className="text-gray-400">Tool ID:</span>
            <code className="ml-2 px-2 py-1 bg-gray-800 rounded text-cyan-400">{toolId}</code>
          </div>

          <div>
            <span className="text-gray-400">Category:</span>
            <span className={cn(
              'ml-2 px-2 py-1 rounded text-xs font-medium',
              tool.category === 'alpaca' && 'bg-amber-900/50 text-amber-400',
              tool.category === 'sec' && 'bg-emerald-900/50 text-emerald-400',
              tool.category === 'calculated' && 'bg-sky-900/50 text-sky-400',
            )}>
              {tool.category.toUpperCase()}
            </span>
          </div>

          <div>
            <div className="text-gray-400 mb-1">Inputs:</div>
            <ul className="list-disc list-inside text-gray-300">
              {tool.inputs.map((input, i) => (
                <li key={i}>{input}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="text-gray-400 mb-1">Outputs:</div>
            <ul className="list-disc list-inside text-gray-300">
              {tool.outputs.map((output, i) => (
                <li key={i}>{output}</li>
              ))}
            </ul>
          </div>

          <div className="pt-2 border-t border-gray-700">
            <span className="text-gray-400">File:</span>
            <code className="ml-2 text-xs text-gray-300">{tool.file}</code>
          </div>
        </div>
      </div>
    </div>
  )
}

interface AgentCardProps {
  agent: ResearchAgent
  isExpanded: boolean
  onToggle: () => void
  onToolClick: (toolId: string) => void
}

function AgentCard({ agent, isExpanded, onToggle, onToolClick }: AgentCardProps) {
  const [copiedTool, setCopiedTool] = useState<string | null>(null)

  const copyToolName = (toolName: string) => {
    navigator.clipboard.writeText(toolName)
    setCopiedTool(toolName)
    setTimeout(() => setCopiedTool(null), 1500)
  }

  return (
    <div className={cn(
      'border rounded-lg overflow-hidden',
      agent.borderColor,
      agent.bgColor
    )}>
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl">{agent.emoji}</span>
          <div className="text-left">
            <div className="font-semibold text-white">{agent.name}</div>
            <div className="text-xs text-gray-400">{agent.expectedTools} tools expected</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{agent.dataPoints.length} data points</span>
          {isExpanded ? (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          ) : (
            <ChevronRight className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="border-t border-gray-700/50 px-4 py-3 space-y-2">
          <p className="text-xs text-gray-400 mb-3">{agent.description}</p>

          {agent.dataPoints.map((dp, idx) => (
            <div
              key={idx}
              className="flex items-start gap-3 p-2 rounded hover:bg-white/5 transition-colors group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200">{dp.name}</span>
                  <span className="text-gray-500">→</span>
                  <button
                    onClick={() => onToolClick(dp.tool)}
                    className="text-cyan-400 hover:text-cyan-300 font-mono text-sm hover:underline"
                  >
                    {dp.tool}
                  </button>
                  <button
                    onClick={() => copyToolName(dp.tool)}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Copy tool name"
                  >
                    {copiedTool === dp.tool ? (
                      <Check className="w-3 h-3 text-green-400" />
                    ) : (
                      <Copy className="w-3 h-3 text-gray-500 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  <span className="text-gray-400">[{dp.source}]</span>
                  <span className="mx-1">·</span>
                  <span>{dp.metric}</span>
                </div>
                {dp.description && (
                  <div className="text-xs text-gray-500 mt-1 italic">{dp.description}</div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function ResearchTaxonomyView() {
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set(['technical']))
  const [selectedTool, setSelectedTool] = useState<string | null>(null)

  const toggleAgent = (agentId: string) => {
    setExpandedAgents(prev => {
      const next = new Set(prev)
      if (next.has(agentId)) {
        next.delete(agentId)
      } else {
        next.add(agentId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedAgents(new Set(RESEARCH_AGENTS.map(a => a.id)))
  }

  const collapseAll = () => {
    setExpandedAgents(new Set())
  }

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{RESEARCH_STATS.totalAgents}</div>
          <div className="text-xs text-gray-400">Research Agents</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{RESEARCH_STATS.totalTools}</div>
          <div className="text-xs text-gray-400">Available Tools</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-white">{RESEARCH_STATS.totalDataPoints}</div>
          <div className="text-xs text-gray-400">Data Points</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-cyan-400">{RESEARCH_STATS.expectedToolCalls}</div>
          <div className="text-xs text-gray-400">Tool Calls/Run</div>
        </div>
        <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
          <div className="text-2xl font-bold text-emerald-400">{RESEARCH_STATS.expectedDuration}</div>
          <div className="text-xs text-gray-400">Execution Time</div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          Research Agents
        </h2>
        <div className="flex gap-2">
          <button
            onClick={expandAll}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
          >
            Expand All
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1 text-xs bg-gray-800 hover:bg-gray-700 text-gray-300 rounded transition-colors"
          >
            Collapse All
          </button>
        </div>
      </div>

      {/* Agent Cards */}
      <div className="grid gap-4">
        {RESEARCH_AGENTS.map((agent) => (
          <AgentCard
            key={agent.id}
            agent={agent}
            isExpanded={expandedAgents.has(agent.id)}
            onToggle={() => toggleAgent(agent.id)}
            onToolClick={setSelectedTool}
          />
        ))}
      </div>

      {/* Data Sources */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-emerald-400" />
          Data Sources
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DATA_SOURCES.map((source) => (
            <div
              key={source.id}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-white">{source.name}</span>
                <span className={cn(
                  'px-2 py-0.5 rounded text-xs font-medium',
                  source.status === 'free' && 'bg-emerald-900/50 text-emerald-400',
                  source.status === 'api-key' && 'bg-amber-900/50 text-amber-400',
                  source.status === 'authenticated' && 'bg-blue-900/50 text-blue-400',
                  source.status === 'calculated' && 'bg-sky-900/50 text-sky-400',
                )}>
                  {source.status === 'free' && 'FREE'}
                  {source.status === 'api-key' && 'API Key'}
                  {source.status === 'authenticated' && 'Auth Required'}
                  {source.status === 'calculated' && 'Computed'}
                </span>
              </div>
              <p className="text-sm text-gray-400">{source.description}</p>
              {source.rateLimit && (
                <div className="mt-2 text-xs text-gray-500">
                  Rate limit: {source.rateLimit}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Tool Files Reference */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-purple-400" />
          Source Files
        </h2>

        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 space-y-2 font-mono text-sm">
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-amber-400">Alpaca Tools:</span>
            <code className="text-gray-400">lib/alpaca/market-data-tools.ts</code>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-emerald-400">SEC EDGAR:</span>
            <code className="text-gray-400">lib/alpaca/sec-edgar-tools.ts</code>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-purple-400">Agent Orchestration:</span>
            <code className="text-gray-400">lib/agents/research-agents.ts</code>
          </div>
          <div className="flex items-center gap-2 text-gray-300">
            <span className="text-blue-400">Progress Types:</span>
            <code className="text-gray-400">types/research-progress.ts</code>
          </div>
        </div>
      </div>

      {/* Tool Detail Modal */}
      {selectedTool && (
        <ToolDetailModal
          toolId={selectedTool}
          onClose={() => setSelectedTool(null)}
        />
      )}
    </div>
  )
}

export default ResearchTaxonomyView
