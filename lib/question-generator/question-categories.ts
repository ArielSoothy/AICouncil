// Question generation categories for AI consensus testing and user inspiration
// Perfect for MVP validation and "eating our own dog food"

export interface QuestionTemplate {
  category: string
  template: string
  description: string
  priority: 'high' | 'medium' | 'low'
  complexity: 'quick' | 'analysis' | 'strategic'
}

export const QUESTION_CATEGORIES = {
  MVP_DEVELOPMENT: 'MVP Development',
  AI_TECH: 'AI & Technology',
  PRODUCT_STRATEGY: 'Product Strategy',
  USER_EXPERIENCE: 'User Experience',
  BUSINESS_MODEL: 'Business Model'
} as const

export const QUESTION_TEMPLATES: QuestionTemplate[] = [
  // MVP Development Questions
  {
    category: QUESTION_CATEGORIES.MVP_DEVELOPMENT,
    template: "Should I prioritize {feature_type} or {alternative_type} for my {product_stage} MVP?",
    description: "Compare feature priorities for MVP development",
    priority: 'high',
    complexity: 'strategic'
  },
  {
    category: QUESTION_CATEGORIES.MVP_DEVELOPMENT,
    template: "What's the optimal {metric} target for a {product_type} in the first {timeframe}?",
    description: "Set realistic targets for MVP metrics",
    priority: 'high',
    complexity: 'analysis'
  },
  {
    category: QUESTION_CATEGORIES.MVP_DEVELOPMENT,
    template: "Should I launch with {approach_a} or wait for {approach_b} to be ready?",
    description: "Timing decisions for MVP launch",
    priority: 'medium',
    complexity: 'strategic'
  },

  // AI & Technology Questions
  {
    category: QUESTION_CATEGORIES.AI_TECH,
    template: "{ai_model_a} vs {ai_model_b} vs {ai_model_c} for {use_case}?",
    description: "Compare AI models for specific use cases",
    priority: 'high',
    complexity: 'analysis'
  },
  {
    category: QUESTION_CATEGORIES.AI_TECH,
    template: "Should I use {number} AI models or {alternative_number} models for {task_type}?",
    description: "Optimize model count for accuracy vs cost",
    priority: 'high',
    complexity: 'analysis'
  },
  {
    category: QUESTION_CATEGORIES.AI_TECH,
    template: "Real-time streaming vs batch processing for {ai_task}?",
    description: "Choose processing approach for AI tasks",
    priority: 'medium',
    complexity: 'analysis'
  },

  // Product Strategy Questions
  {
    category: QUESTION_CATEGORIES.PRODUCT_STRATEGY,
    template: "Should I target {market_a} or {market_b} first for {product_type}?",
    description: "Market selection strategy decisions",
    priority: 'high',
    complexity: 'strategic'
  },
  {
    category: QUESTION_CATEGORIES.PRODUCT_STRATEGY,
    template: "Is {strategy_a} or {strategy_b} better for {business_goal}?",
    description: "Compare strategic approaches",
    priority: 'medium',
    complexity: 'strategic'
  },
  {
    category: QUESTION_CATEGORIES.PRODUCT_STRATEGY,
    template: "Should I focus on {metric_a} or {metric_b} to measure {product_success}?",
    description: "Choose key metrics for product success",
    priority: 'medium',
    complexity: 'analysis'
  },

  // User Experience Questions
  {
    category: QUESTION_CATEGORIES.USER_EXPERIENCE,
    template: "Show {detail_level_a} or {detail_level_b} for {user_action}?",
    description: "Optimize information display for users",
    priority: 'medium',
    complexity: 'analysis'
  },
  {
    category: QUESTION_CATEGORIES.USER_EXPERIENCE,
    template: "Should users see {information_a} and {information_b} or just {simplified_view}?",
    description: "Balance information richness vs simplicity",
    priority: 'medium',
    complexity: 'quick'
  },
  {
    category: QUESTION_CATEGORIES.USER_EXPERIENCE,
    template: "{ui_pattern_a} vs {ui_pattern_b} for {user_task}?",
    description: "Compare UI patterns for user tasks",
    priority: 'low',
    complexity: 'quick'
  },

  // Business Model Questions
  {
    category: QUESTION_CATEGORIES.BUSINESS_MODEL,
    template: "Freemium vs trial-based vs subscription-only for {product_type}?",
    description: "Choose optimal pricing model",
    priority: 'high',
    complexity: 'strategic'
  },
  {
    category: QUESTION_CATEGORIES.BUSINESS_MODEL,
    template: "What's the ideal pricing for {product_feature} targeting {customer_segment}?",
    description: "Optimize pricing strategy",
    priority: 'high',
    complexity: 'analysis'
  },
  {
    category: QUESTION_CATEGORIES.BUSINESS_MODEL,
    template: "Should I monetize through {revenue_model_a} or {revenue_model_b}?",
    description: "Compare revenue model options",
    priority: 'medium',
    complexity: 'strategic'
  }
]

// Specific variables for template filling
export const TEMPLATE_VARIABLES = {
  feature_type: ['user analytics', 'new features', 'performance optimization', 'UI improvements'],
  alternative_type: ['bug fixes', 'integrations', 'documentation', 'marketing'],
  product_stage: ['early', 'growth', 'scaling'],
  metric: ['user retention', 'daily active users', 'conversion rate', 'churn rate'],
  product_type: ['AI SaaS tool', 'decision platform', 'multi-AI service'],
  timeframe: ['3 months', '6 months', '12 months'],
  approach_a: ['minimal features', 'freemium model', 'B2B focus'],
  approach_b: ['full feature set', 'paid-only model', 'B2C focus'],

  ai_model_a: ['Claude 3.5 Sonnet', 'GPT-4o', 'Gemini Pro'],
  ai_model_b: ['Llama 3.3 70B', 'Mixtral 8x7B', 'Gemini Flash'],
  ai_model_c: ['Qwen 2.5 72B', 'Command R+', 'Grok'],
  use_case: ['consensus synthesis', 'query analysis', 'response evaluation'],
  number: ['3', '5', '7'],
  alternative_number: ['2', '4', '6'],
  task_type: ['better accuracy vs cost', 'faster responses', 'diverse perspectives'],
  ai_task: ['consensus generation', 'response analysis', 'model evaluation'],

  market_a: ['B2B', 'enterprise', 'developers'],
  market_b: ['B2C', 'SMBs', 'general users'],
  strategy_a: ['feature-first', 'user acquisition', 'viral growth'],
  strategy_b: ['feedback-first', 'retention focus', 'word-of-mouth'],
  business_goal: ['user growth', 'revenue optimization', 'market validation'],
  metric_a: ['engagement metrics', 'usage frequency', 'feature adoption'],
  metric_b: ['satisfaction scores', 'conversion rates', 'retention rates'],
  product_success: ['MVP validation', 'market fit', 'growth potential'],

  detail_level_a: ['individual model responses', 'full analysis', 'complete breakdown'],
  detail_level_b: ['consensus summary', 'key insights', 'simplified results'],
  user_action: ['query results', 'decision making', 'comparison analysis'],
  information_a: ['confidence scores', 'model disagreements', 'reasoning steps'],
  information_b: ['cost breakdowns', 'performance metrics', 'accuracy ratings'],
  simplified_view: ['final recommendation', 'consensus result', 'action items'],
  ui_pattern_a: ['tabs interface', 'accordion layout', 'side-by-side'],
  ui_pattern_b: ['single column', 'modal dialogs', 'progressive disclosure'],
  user_task: ['comparing results', 'understanding consensus', 'making decisions'],

  product_feature: ['AI consensus analysis', 'multi-model queries', 'premium models'],
  customer_segment: ['solo entrepreneurs', 'small teams', 'enterprise users'],
  revenue_model_a: ['subscription tiers', 'pay-per-query', 'usage-based'],
  revenue_model_b: ['one-time purchase', 'advertising', 'partnerships']
}

// Pre-generated specific questions that are especially relevant to our product
export const PRIORITY_QUESTIONS = [
  "Claude 3.5 Sonnet vs GPT-4o vs Gemini Pro for consensus synthesis?",
  "Should I use 3 AI models or 5 models for better accuracy vs cost?",
  "Show individual model responses or just consensus summary for query results?",
  "Freemium vs trial-based vs subscription-only for AI SaaS tool?",
  "Should I prioritize user analytics or new features for my growth MVP?",
  "Agent debates vs simple consensus: which provides more user value?",
  "Should users see confidence scores and model disagreements or just final recommendation?",
  "Is feature-first or feedback-first better for user growth?",
  "Real-time streaming vs batch processing for consensus generation?",
  "Should I target B2B or B2C first for decision platform?"
]