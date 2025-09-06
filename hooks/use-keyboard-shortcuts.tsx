import React, { useEffect, useRef } from 'react'

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  metaKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: () => void
  description: string
}

/**
 * Hook for managing keyboard shortcuts
 * Provides common shortcuts for AI interfaces
 */
export function useKeyboardShortcuts(shortcuts: KeyboardShortcut[], enabled: boolean = true) {
  const shortcutsRef = useRef(shortcuts)
  
  // Update shortcuts ref when they change
  useEffect(() => {
    shortcutsRef.current = shortcuts
  }, [shortcuts])
  
  useEffect(() => {
    if (!enabled) return
    
    const handleKeyDown = (event: KeyboardEvent) => {
      const matchedShortcut = shortcutsRef.current.find(shortcut => {
        return (
          event.key.toLowerCase() === shortcut.key.toLowerCase() &&
          !!event.ctrlKey === !!shortcut.ctrlKey &&
          !!event.metaKey === !!shortcut.metaKey &&
          !!event.shiftKey === !!shortcut.shiftKey &&
          !!event.altKey === !!shortcut.altKey
        )
      })
      
      if (matchedShortcut) {
        event.preventDefault()
        event.stopPropagation()
        matchedShortcut.action()
      }
    }
    
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [enabled])
  
  return {
    shortcuts: shortcutsRef.current
  }
}

/**
 * Pre-defined shortcut configurations for common AI interface actions
 */
export const createAIInterfaceShortcuts = (
  onSubmit: () => void,
  onClear: () => void,
  isLoading: boolean = false,
  canSubmit: boolean = true
): KeyboardShortcut[] => [
  {
    key: 'Enter',
    ctrlKey: true,
    action: () => {
      if (!isLoading && canSubmit) {
        onSubmit()
      }
    },
    description: 'Submit query (Ctrl+Enter)'
  },
  {
    key: 'Escape',
    action: () => {
      if (!isLoading) {
        onClear()
      }
    },
    description: 'Clear input (Escape)'
  }
]

/**
 * Hook specifically for AI query interfaces
 */
export function useAIInterfaceShortcuts(
  onSubmit: () => void,
  onClear: () => void,
  isLoading: boolean = false,
  canSubmit: boolean = true,
  enabled: boolean = true
) {
  const shortcuts = createAIInterfaceShortcuts(onSubmit, onClear, isLoading, canSubmit)
  return useKeyboardShortcuts(shortcuts, enabled)
}

/**
 * Hook for enhancing textarea with keyboard shortcuts
 */
export function useTextareaShortcuts(
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  onSubmit: () => void,
  onClear: () => void,
  isLoading: boolean = false,
  canSubmit: boolean = true
) {
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+Enter or Cmd+Enter to submit
      if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault()
        if (!isLoading && canSubmit) {
          onSubmit()
        }
        return
      }
      
      // Escape to clear (only if textarea is focused and has content)
      if (event.key === 'Escape' && !isLoading) {
        event.preventDefault()
        onClear()
        textarea.focus() // Keep focus on textarea after clearing
        return
      }
      
      // Tab navigation enhancement
      if (event.key === 'Tab' && !event.shiftKey && !event.ctrlKey) {
        // Let default tab behavior work, but ensure proper focus management
        // This is handled by browser default behavior
      }
    }
    
    textarea.addEventListener('keydown', handleKeyDown)
    return () => textarea.removeEventListener('keydown', handleKeyDown)
  }, [textareaRef, onSubmit, onClear, isLoading, canSubmit])
}

/**
 * Get keyboard shortcut display text for help/tooltips
 */
export function getShortcutDisplayText(shortcut: KeyboardShortcut): string {
  const parts = []
  
  if (shortcut.ctrlKey || shortcut.metaKey) {
    // Use Cmd on Mac, Ctrl on others
    const isMac = typeof navigator !== 'undefined' && navigator.platform.toUpperCase().indexOf('MAC') >= 0
    parts.push(isMac && shortcut.metaKey ? '⌘' : 'Ctrl')
  }
  
  if (shortcut.shiftKey) parts.push('Shift')
  if (shortcut.altKey) parts.push('Alt')
  
  parts.push(shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase())
  
  return parts.join('+')
}

/**
 * Component to display keyboard shortcuts help
 */
export interface KeyboardShortcutsHelpProps {
  shortcuts: KeyboardShortcut[]
  className?: string
}

export function KeyboardShortcutsHelp({ shortcuts, className = '' }: KeyboardShortcutsHelpProps) {
  if (shortcuts.length === 0) return null
  
  return (
    <div className={`text-xs text-muted-foreground ${className}`}>
      <div className="font-medium mb-1">Keyboard shortcuts:</div>
      <div className="space-y-1">
        {shortcuts.map((shortcut, index) => (
          <div key={index} className="flex justify-between items-center">
            <span>{shortcut.description}</span>
            <kbd className="px-1 py-0.5 bg-muted rounded text-xs font-mono">
              {getShortcutDisplayText(shortcut)}
            </kbd>
          </div>
        ))}
      </div>
    </div>
  )
}