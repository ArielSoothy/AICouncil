'use client'

import { useState } from 'react'
import { X, Play, AlertTriangle, Bot, Gavel, Settings2 } from 'lucide-react'
import { DEFAULT_SCREENING_DEBATE_CONFIG } from '@/lib/trading/screening-debate/types'
import type { ScreeningDebateConfig } from '@/lib/trading/screening-debate/types'
import type { BrokerId } from '@/lib/brokers/types'

interface DebateConfigModalProps {
  isOpen: boolean
  onClose: () => void
  onStart: (config: ScreeningDebateConfig) => void
  availableBrokers?: { id: BrokerId; name: string }[]
}

const AVAILABLE_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B', badge: 'FREE' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B', badge: 'FREE' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', badge: 'FREE' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', badge: '$' },
  { id: 'gpt-4o', name: 'GPT-4o', badge: '$$' },
  { id: 'claude-sonnet-4-5-20250929', name: 'Claude Sonnet 4.5', badge: '$$$' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', badge: '$$' },
]

export function DebateConfigModal({ isOpen, onClose, onStart, availableBrokers }: DebateConfigModalProps) {
  const [config, setConfig] = useState<ScreeningDebateConfig>({
    ...DEFAULT_SCREENING_DEBATE_CONFIG,
  })

  if (!isOpen) return null

  const handleStart = () => {
    onStart(config)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Settings2 className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Debate Configuration</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Top N Stocks */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Stocks to Debate: <span className="text-blue-600 font-bold">{config.topN}</span>
            </label>
            <input
              type="range"
              min={1}
              max={10}
              value={config.topN}
              onChange={e => setConfig(prev => ({ ...prev, topN: parseInt(e.target.value) }))}
              className="w-full accent-blue-500"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1 (quick)</span>
              <span>5</span>
              <span>10 (thorough)</span>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium flex items-center gap-1">
              <Bot className="w-4 h-4" /> Agent Models
            </h3>

            <ModelSelect
              label="Analyst"
              value={config.analystModel}
              onChange={v => setConfig(prev => ({ ...prev, analystModel: v }))}
            />
            <ModelSelect
              label="Critic"
              value={config.criticModel}
              onChange={v => setConfig(prev => ({ ...prev, criticModel: v }))}
            />
            <ModelSelect
              label="Synthesizer"
              value={config.synthesizerModel}
              onChange={v => setConfig(prev => ({ ...prev, synthesizerModel: v }))}
            />
            <ModelSelect
              label="Judge"
              value={config.judgeModel}
              onChange={v => setConfig(prev => ({ ...prev, judgeModel: v }))}
              icon={<Gavel className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Auto-Trade Section */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium flex items-center gap-1">
                Auto-Trade (Paper)
              </label>
              <button
                onClick={() => setConfig(prev => ({ ...prev, autoTrade: !prev.autoTrade }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${
                  config.autoTrade ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                    config.autoTrade ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>

            {config.autoTrade && (
              <>
                <div className="flex items-start gap-2 p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-xs text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>Auto-trade will place paper orders for BUY verdicts above your confidence threshold.</span>
                </div>

                {/* Broker Selection */}
                {availableBrokers && availableBrokers.length > 1 && (
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Broker</label>
                    <select
                      value={config.brokerId}
                      onChange={e => setConfig(prev => ({ ...prev, brokerId: e.target.value as BrokerId }))}
                      className="w-full text-sm border rounded px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
                    >
                      {availableBrokers.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.name} {b.id === 'ibkr' ? '(Paper available)' : '(Paper)'}
                        </option>
                      ))}
                    </select>
                    {config.brokerId === 'ibkr' && (
                      <p className="text-xs text-amber-600 mt-1">
                        IBKR supports live trading - ensure you are on paper account!
                      </p>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Max Position (shares)</label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={config.maxPositionSize}
                      onChange={e => setConfig(prev => ({ ...prev, maxPositionSize: parseInt(e.target.value) || 10 }))}
                      className="w-full text-sm border rounded px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Min Confidence (%)</label>
                    <input
                      type="number"
                      min={50}
                      max={100}
                      value={config.minConfidence}
                      onChange={e => setConfig(prev => ({ ...prev, minConfidence: parseInt(e.target.value) || 75 }))}
                      className="w-full text-sm border rounded px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            ~{config.topN * 40}s estimated ({config.topN} stocks x 7 LLM calls)
          </p>
          <button
            onClick={handleStart}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Play className="w-4 h-4" />
            Start Debate
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Model Select Component ────────────────────────────────────────────────

function ModelSelect({
  label,
  value,
  onChange,
  icon,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2">
      <label className="text-xs text-gray-500 w-24 flex items-center gap-1">
        {icon}
        {label}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="flex-1 text-sm border rounded px-2 py-1.5 dark:bg-gray-700 dark:border-gray-600"
      >
        {AVAILABLE_MODELS.map(m => (
          <option key={m.id} value={m.id}>
            {m.name} [{m.badge}]
          </option>
        ))}
      </select>
    </div>
  )
}
