'use client'

import { Brain, Shield, Users, Target, LucideIcon } from 'lucide-react'

type AgentRole = 'analyst' | 'critic' | 'synthesizer'

interface AgentAvatarProps {
  role: AgentRole
  name?: string
  size?: 'sm' | 'md' | 'lg'
  showName?: boolean
  className?: string
}

const agentIcons: Record<AgentRole, LucideIcon> = {
  analyst: Brain,
  critic: Shield,
  synthesizer: Users
}

const agentColors: Record<AgentRole, string> = {
  analyst: '#3B82F6', // blue
  critic: '#EF4444',  // red
  synthesizer: '#10B981' // green
}

const sizeConfig = {
  sm: { icon: 'w-4 h-4', text: 'text-xs' },
  md: { icon: 'w-5 h-5', text: 'text-sm' },
  lg: { icon: 'w-6 h-6', text: 'text-base' }
}

export function AgentAvatar({ 
  role, 
  name, 
  size = 'md', 
  showName = false, 
  className = '' 
}: AgentAvatarProps) {
  const Icon = agentIcons[role]
  const color = agentColors[role]
  const sizeClasses = sizeConfig[size]
  
  const displayName = name || role.charAt(0).toUpperCase() + role.slice(1)

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Icon 
        className={sizeClasses.icon} 
        style={{ color }} 
      />
      {showName && (
        <span className={`font-semibold ${sizeClasses.text}`}>
          {displayName}
        </span>
      )}
    </div>
  )
}