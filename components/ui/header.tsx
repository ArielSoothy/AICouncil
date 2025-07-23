'use client'

import { Brain, User, LogOut, BarChart3 } from 'lucide-react'
import { Button } from './button'
import { useAuth } from '@/contexts/auth-context'
import Link from 'next/link'

export function Header() {
  const { user, signOut } = useAuth()

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Consensus AI</h1>
            <p className="text-xs text-muted-foreground">Multi-Model Decision Engine</p>
          </div>
        </Link>
        
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              <Button 
                variant="ghost" 
                size="sm"
                onClick={signOut}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </>
          ) : (
            <div className="flex gap-2">
              <Link href="/auth">
                <Button variant="outline" size="sm">
                  <User className="h-4 w-4 mr-2" />
                  Sign In
                </Button>
              </Link>
              <Link href="/auth?mode=signup">
                <Button size="sm">
                  Get Started
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
