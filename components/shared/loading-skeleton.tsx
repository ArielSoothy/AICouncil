'use client'

interface LoadingSkeletonProps {
  variant?: 'text' | 'card' | 'avatar' | 'button'
  lines?: number
  className?: string
}

export function LoadingSkeleton({ 
  variant = 'text', 
  lines = 3, 
  className = '' 
}: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-muted rounded'
  
  if (variant === 'text') {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, i) => (
          <div 
            key={i}
            className={`${baseClasses} h-4`}
            style={{ width: `${Math.random() * 30 + 70}%` }}
          />
        ))}
      </div>
    )
  }
  
  if (variant === 'card') {
    return (
      <div className={`${baseClasses} p-4 space-y-3 ${className}`}>
        <div className="flex items-center space-x-2">
          <div className={`${baseClasses} w-8 h-8 rounded-full`} />
          <div className={`${baseClasses} h-4 w-24`} />
        </div>
        <div className="space-y-2">
          {Array.from({ length: lines }).map((_, i) => (
            <div 
              key={i}
              className={`${baseClasses} h-4`}
              style={{ width: `${Math.random() * 30 + 70}%` }}
            />
          ))}
        </div>
      </div>
    )
  }
  
  if (variant === 'avatar') {
    return (
      <div className={`${baseClasses} w-8 h-8 rounded-full ${className}`} />
    )
  }
  
  if (variant === 'button') {
    return (
      <div className={`${baseClasses} h-10 w-24 ${className}`} />
    )
  }
  
  return null
}