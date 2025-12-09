'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

interface AuthContextType {
  user: User | null
  userTier: 'free' | 'pro' | 'enterprise' | null
  premiumCredits: number
  loading: boolean
  signUp: (email: string, password: string) => Promise<{ error: any }>
  signIn: (email: string, password: string) => Promise<{ error: any }>
  signOut: () => Promise<void>
  refreshUserProfile: () => Promise<void>
  usePremiumCredit: () => Promise<boolean>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userTier, setUserTier] = useState<'free' | 'pro' | 'enterprise' | null>(null)
  const [premiumCredits, setPremiumCredits] = useState<number>(0)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const fetchUserProfile = async (userId: string) => {
    try {
      const { data: profile, error} = await supabase
        .from('users')
        .select('subscription_tier')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user profile:', error)
        // User might not exist in our users table yet, create them
        if (error.code === 'PGRST116') { // No rows returned
          try {
            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
              await supabase
                .from('users')
                .insert({
                  id: user.id,
                  email: user.email || ''
                })
            }
          } catch (insertError) {
            console.error('Error creating user profile:', insertError)
          }
        }
        setUserTier('free')
        setPremiumCredits(5) // Default free tier credits
      } else {
        const tier = profile?.subscription_tier || 'free'
        setUserTier(tier)
        // Set premium credits based on tier (no database column needed)
        setPremiumCredits(tier === 'free' ? 5 : tier === 'pro' ? 50 : 999)
      }
    } catch (error) {
      console.error('Error fetching user profile:', error)
      setUserTier('free') // Default to free on error
      setPremiumCredits(5) // Default free tier credits
    }
  }

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setUser(session?.user ?? null)

      if (session?.user?.id) {
        await fetchUserProfile(session.user.id)
      } else {
        setUserTier(null)
        setPremiumCredits(0)
      }

      setLoading(false)
    }

    getInitialSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: string, session: { user?: User | null } | null) => {
        setUser(session?.user ?? null)

        if (session?.user?.id) {
          await fetchUserProfile(session.user.id)
        } else {
          setUserTier(null)
          setPremiumCredits(0)
        }

        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    return { error }
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    return { error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshUserProfile = async () => {
    if (user?.id) {
      await fetchUserProfile(user.id)
    }
  }

  const usePremiumCredit = async (): Promise<boolean> => {
    if (!user?.id || premiumCredits <= 0) {
      return false
    }

    try {
      const { error } = await supabase
        .from('users')
        .update({ premium_credits: premiumCredits - 1 })
        .eq('id', user.id)

      if (error) {
        console.error('Error using premium credit:', error)
        return false
      }

      setPremiumCredits(prev => prev - 1)
      return true
    } catch (error) {
      console.error('Error using premium credit:', error)
      return false
    }
  }

  const value = {
    user,
    userTier,
    premiumCredits,
    loading,
    signUp,
    signIn,
    signOut,
    refreshUserProfile,
    usePremiumCredit,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}