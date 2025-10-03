/**
 * Brand colors for AI providers
 * Used in Ultra Mode for clickable model badges
 */

export const PROVIDER_COLORS = {
  anthropic: 'bg-orange-500 hover:bg-orange-600 text-white',
  openai: 'bg-gray-100 hover:bg-gray-200 text-black border border-gray-300',
  google: 'bg-blue-500 hover:bg-blue-600 text-white',
  groq: 'bg-purple-600 hover:bg-purple-700 text-white',
  xai: 'bg-black hover:bg-gray-900 text-white',
  perplexity: 'bg-teal-500 hover:bg-teal-600 text-white',
  mistral: 'bg-red-500 hover:bg-red-600 text-white',
  cohere: 'bg-indigo-500 hover:bg-indigo-600 text-white'
} as const

export const PROVIDER_NAMES = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
  google: 'Google',
  groq: 'Groq',
  xai: 'xAI',
  perplexity: 'Perplexity',
  mistral: 'Mistral',
  cohere: 'Cohere'
} as const

export type Provider = keyof typeof PROVIDER_COLORS
