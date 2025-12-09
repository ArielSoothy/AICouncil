/**
 * Provider Brand Colors & Styles
 * Maintains consistent visual identity across all trading modes
 */

export const PROVIDER_STYLES = {
  anthropic: {
    name: 'Anthropic',
    color: 'from-orange-500 to-amber-600',
    borderColor: 'border-orange-500',
    bgColor: 'bg-orange-50 dark:bg-orange-950/20',
    textColor: 'text-orange-700 dark:text-orange-400',
    icon: '🟠'
  },
  openai: {
    name: 'OpenAI',
    color: 'from-emerald-500 to-teal-600',
    borderColor: 'border-emerald-500',
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/20',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    icon: '⚪'
  },
  google: {
    name: 'Google',
    color: 'from-blue-500 to-indigo-600',
    borderColor: 'border-blue-500',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
    textColor: 'text-blue-700 dark:text-blue-400',
    icon: '🔵'
  },
  groq: {
    name: 'Groq',
    color: 'from-purple-500 to-pink-600',
    borderColor: 'border-purple-500',
    bgColor: 'bg-purple-50 dark:bg-purple-950/20',
    textColor: 'text-purple-700 dark:text-purple-400',
    icon: '🟣'
  },
  mistral: {
    name: 'Mistral',
    color: 'from-red-500 to-orange-600',
    borderColor: 'border-red-500',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
    textColor: 'text-red-700 dark:text-red-400',
    icon: '🔴'
  },
  perplexity: {
    name: 'Perplexity',
    color: 'from-cyan-500 to-blue-600',
    borderColor: 'border-cyan-500',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/20',
    textColor: 'text-cyan-700 dark:text-cyan-400',
    icon: '🔷'
  },
  cohere: {
    name: 'Cohere',
    color: 'from-pink-500 to-rose-600',
    borderColor: 'border-pink-500',
    bgColor: 'bg-pink-50 dark:bg-pink-950/20',
    textColor: 'text-pink-700 dark:text-pink-400',
    icon: '💗'
  },
  xai: {
    name: 'xAI',
    color: 'from-slate-500 to-gray-600',
    borderColor: 'border-slate-500',
    bgColor: 'bg-slate-50 dark:bg-slate-950/20',
    textColor: 'text-slate-700 dark:text-slate-400',
    icon: '⚫'
  }
} as const;

export type ProviderType = keyof typeof PROVIDER_STYLES;
