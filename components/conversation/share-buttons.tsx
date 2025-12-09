'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { Link2, Share2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface ShareButtonsProps {
  conversationId: string
  query: string
  mode: 'ultra' | 'consensus' | 'agent-debate'
}

export function ShareButtons({ conversationId, query, mode }: ShareButtonsProps) {
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  // Generate the shareable URL
  const getShareUrl = () => {
    const basePath = mode === 'ultra' ? '/ultra' : mode === 'agent-debate' ? '/agents' : '/'
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
    return `${baseUrl}${basePath}?c=${conversationId}`
  }

  // Copy link to clipboard
  const handleCopyLink = async () => {
    try {
      const url = getShareUrl()
      await navigator.clipboard.writeText(url)
      toast({
        title: 'Link Copied!',
        description: 'Conversation link copied to clipboard',
      })
      setIsOpen(false)
    } catch (error) {
      console.error('Failed to copy link:', error)
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to copy link to clipboard',
      })
    }
  }

  // Share to Twitter/X
  const handleShareTwitter = () => {
    const url = getShareUrl()
    const truncatedQuery = query.length > 100 ? query.substring(0, 100) + '...' : query
    const modeText = mode === 'ultra' ? 'Ultra Mode (13 AI models)' :
                     mode === 'agent-debate' ? 'Agent Debate' :
                     'AI Consensus'

    const text = `I just used Verdict AI's ${modeText} to analyze: "${truncatedQuery}"\n\nCheck out the results:`
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`

    window.open(twitterUrl, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  // Share to LinkedIn
  const handleShareLinkedIn = () => {
    const url = getShareUrl()
    const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`

    window.open(linkedInUrl, '_blank', 'noopener,noreferrer')
    setIsOpen(false)
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={handleCopyLink} className="cursor-pointer">
          <Link2 className="h-4 w-4 mr-2" />
          Copy Link
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareTwitter} className="cursor-pointer">
          <svg
            className="h-4 w-4 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          Share on X
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleShareLinkedIn} className="cursor-pointer">
          <svg
            className="h-4 w-4 mr-2"
            viewBox="0 0 24 24"
            fill="currentColor"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Share on LinkedIn
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
