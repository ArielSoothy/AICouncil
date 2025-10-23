'use client'

import { useState } from 'react'
import { Brain, User, LogOut, BarChart3, Users, Shield, Menu, X, Gem, TrendingUp } from 'lucide-react'
import { Button } from './button'
import { useAuth } from '@/contexts/auth-context'
import { PROJECT_NAME } from '@/lib/config/branding'
import Link from 'next/link'

export function Header() {
  const { user, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  return (
    <header className="border-b">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
          <Brain className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">{PROJECT_NAME}</h1>
            <p className="text-xs text-muted-foreground">Multi-Model Decision Engine</p>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-2">
          <Link href="/marketing">
            <Button variant="ghost" size="sm">
              <BarChart3 className="h-4 w-4 mr-2" />
              About
            </Button>
          </Link>

          <Link href="/agents">
            <Button variant="ghost" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Agents
            </Button>
          </Link>

          <Link href="/trading">
            <Button variant="ghost" size="sm" className="text-green-600 hover:text-green-700">
              <TrendingUp className="h-4 w-4 mr-2" />
              Trading
            </Button>
          </Link>

          <Link href="/ultra">
            <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 font-semibold">
              <Gem className="h-4 w-4 mr-2" />
              Ultra Mode
            </Button>
          </Link>

          {/* Admin button - Development only */}
          {process.env.NODE_ENV === 'development' && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700">
                <Shield className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </Link>
          )}
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
        </nav>

        {/* Mobile Hamburger Button */}
        <button
          className="md:hidden p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          aria-label="Toggle mobile menu"
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>
      </div>

      {/* Mobile Navigation Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t bg-white dark:bg-gray-900">
          <div className="container mx-auto px-4 py-4 space-y-2">
            <Link href="/marketing" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                About
              </Button>
            </Link>

            <Link href="/agents" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start">
                <Users className="h-4 w-4 mr-2" />
                Agents
              </Button>
            </Link>

            <Link href="/trading" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-green-600 hover:text-green-700">
                <TrendingUp className="h-4 w-4 mr-2" />
                Trading
              </Button>
            </Link>

            <Link href="/ultra" onClick={() => setIsMobileMenuOpen(false)}>
              <Button variant="ghost" size="sm" className="w-full justify-start text-purple-600 hover:text-purple-700 font-semibold">
                <Gem className="h-4 w-4 mr-2" />
                Ultra Mode
              </Button>
            </Link>

            {/* Admin button - Development only */}
            {process.env.NODE_ENV === 'development' && (
              <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)}>
                <Button variant="ghost" size="sm" className="w-full justify-start text-orange-600 hover:text-orange-700">
                  <Shield className="h-4 w-4 mr-2" />
                  Admin
                </Button>
              </Link>
            )}

            {user ? (
              <>
                <Link href="/dashboard" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start">
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => {
                    signOut()
                    setIsMobileMenuOpen(false)
                  }}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </Button>
              </>
            ) : (
              <div className="space-y-2">
                <Link href="/auth" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button variant="outline" size="sm" className="w-full justify-start">
                    <User className="h-4 w-4 mr-2" />
                    Sign In
                  </Button>
                </Link>
                <Link href="/auth?mode=signup" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  )
}