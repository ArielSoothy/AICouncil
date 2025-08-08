'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { useRouter, useSearchParams } from 'next/navigation'

export function AuthForms() {
  const [isSignUp, setIsSignUp] = useState(false)
  // Default test credentials for development
  const [email, setEmail] = useState(process.env.NODE_ENV === 'development' ? 'arielsoothy@gmail.com' : '')
  const [password, setPassword] = useState(process.env.NODE_ENV === 'development' ? 'test1234' : '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  
  const { signUp, signIn, user, loading: authLoading } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()

  // Check if URL indicates signup mode
  useEffect(() => {
    if (searchParams.get('mode') === 'signup') {
      setIsSignUp(true)
    }
  }, [searchParams])

  // Redirect to main page when user is authenticated
  useEffect(() => {
    console.log('Auth state:', { user: user?.id, authLoading, formLoading: loading })
    if (user && !authLoading) {
      // Check for redirect parameter in URL
      const redirect = searchParams.get('redirect') || '/app'
      console.log('Auth redirect triggered:', { user: user.id, redirect })
      // Clear loading state immediately when user is detected
      setLoading(false)
      // Small delay to ensure auth state is properly set
      setTimeout(() => {
        router.push(redirect)
      }, 100)
    }
  }, [user, authLoading, loading, router, searchParams])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Form submitted:', { email, isSignUp })
    setLoading(true)
    setError('')
    setSuccessMessage('')

    try {
      if (isSignUp) {
        console.log('Attempting sign up...')
        const { error } = await signUp(email, password)
        if (error) {
          console.error('Sign up error:', error)
          setError(error.message)
        } else {
          console.log('Sign up successful')
          setSuccessMessage('Check your email for a confirmation link to complete your signup!')
          setEmail('')
          setPassword('')
        }
        setLoading(false)
      } else {
        console.log('Attempting sign in...')
        const { error } = await signIn(email, password)
        console.log('Sign in result:', { error: error?.message })
        
        if (error) {
          console.error('Sign in error:', error)
          setError(error.message)
          setLoading(false)
        } else {
          console.log('Sign-in successful, navigating...')
          const redirect = searchParams.get('redirect') || '/app'
          // Navigate immediately; AuthContext will hydrate user shortly after
          setLoading(false)
          router.push(redirect)
        }
      }
    } catch (err) {
      console.error('Unexpected error:', err)
      setError('An unexpected error occurred')
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="w-full max-w-md space-y-8 p-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight consensus-gradient bg-clip-text text-transparent">
            Consensus AI
          </h1>
          <p className="mt-2 text-muted-foreground">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email address
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter your email"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter your password"
              minLength={6}
            />
          </div>

          {error && (
            <div className="text-red-600 dark:text-red-400 text-sm text-center bg-red-50 dark:bg-red-900/20 p-3 rounded-md border border-red-200 dark:border-red-800">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="text-green-600 dark:text-green-400 text-sm text-center bg-green-50 dark:bg-green-900/20 p-3 rounded-md border border-green-200 dark:border-green-800">
              {successMessage}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Loading...' : (isSignUp ? 'Sign up' : 'Sign in')}
          </Button>
        </form>

        <div className="text-center">
          <button
            type="button"
            onClick={() => {
              setIsSignUp(!isSignUp)
              setError('')
            }}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
          >
            {isSignUp 
              ? 'Already have an account? Sign in'
              : "Don't have an account? Sign up"
            }
          </button>
        </div>
      </div>
    </div>
  )
}