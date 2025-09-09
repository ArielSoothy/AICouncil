// UI Configuration Constants

export const UI_CONFIG = {
  // Text truncation limits
  truncation: {
    roundTabs: 600,
    insights: 400,
    messagePreview: 600,
    shortPreview: 150,
  },
  
  // Layout dimensions
  layout: {
    scrollAreaHeight: '800px',
    cardSpacing: 'space-y-4',
    sectionSpacing: 'space-y-6',
  },
  
  // Animation durations (in ms)
  animations: {
    expandCollapse: 300,
    fadeIn: 200,
    slideIn: 250,
  },
  
  // Loading and skeleton settings
  loading: {
    skeletonLines: 3,
    pulseDelay: 100,
  },
  
  // Icon sizes
  iconSizes: {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4', 
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  },
  
  // Common spacing values
  spacing: {
    xs: '0.5',
    sm: '1',
    md: '2', 
    lg: '3',
    xl: '4',
    '2xl': '6',
  },
  
  // Border radius values
  borderRadius: {
    sm: 'rounded',
    md: 'rounded-lg',
    lg: 'rounded-xl',
    full: 'rounded-full',
  },
  
  // Shadow classes
  shadows: {
    sm: 'shadow-sm',
    md: 'shadow-md',
    lg: 'shadow-lg',
    card: 'shadow-sm hover:shadow-md transition-shadow',
  },
} as const

// Color palette for consistent theming
export const UI_COLORS = {
  // Status colors
  status: {
    success: 'text-green-600 bg-green-50 dark:bg-green-900/20',
    warning: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
    error: 'text-red-600 bg-red-50 dark:bg-red-900/20',
    info: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  },
  
  // Agent colors (consistent across components)
  agents: {
    analyst: '#3B82F6',   // blue
    critic: '#EF4444',    // red  
    synthesizer: '#10B981' // green
  },
  
  // Muted text variants
  muted: {
    light: 'text-muted-foreground',
    lighter: 'text-muted-foreground/70',
    lightest: 'text-muted-foreground/50',
  }
} as const

// Typography scales
export const UI_TYPOGRAPHY = {
  sizes: {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base', 
    lg: 'text-lg',
    xl: 'text-xl',
    '2xl': 'text-2xl',
  },
  
  weights: {
    normal: 'font-normal',
    medium: 'font-medium',
    semibold: 'font-semibold',
    bold: 'font-bold',
  },
  
  families: {
    sans: 'font-sans',
    mono: 'font-mono',
  }
} as const

// Breakpoint helpers for responsive design
export const UI_BREAKPOINTS = {
  mobile: 'max-w-sm',
  tablet: 'max-w-md',
  desktop: 'max-w-lg',
  wide: 'max-w-xl',
} as const