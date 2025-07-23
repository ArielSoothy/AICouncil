'use client'

import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { Header } from '@/components/ui/header'
import { Button } from '@/components/ui/button'
import { Database } from '@/types/database'
import Link from 'next/link'

type Conversation = Database['public']['Tables']['conversations']['Row']

export default function DashboardPage() {
  return (
    <AuthWrapper>
      <DashboardContent />
    </AuthWrapper>
  )
}

function DashboardContent() {
  const { user, signOut } = useAuth()


  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">Dashboard</h1>
              <p className="text-gray-600 dark:text-gray-400">
                Welcome back, {user?.email}
              </p>
            </div>
            <div className="flex gap-4">
              <Link href="/">
                <Button variant="outline">New Query</Button>
              </Link>
              <Button
                variant="outline"
                onClick={signOut}
              >
                Sign Out
              </Button>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">🚧</span>
                </div>
                <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Coming Soon
                </h2>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  The dashboard with conversation history and analytics is currently under development.
                </p>
                <Link href="/">
                  <Button className="inline-flex items-center gap-2">
                    <span>Try AI Council</span>
                    <span className="text-lg">→</span>
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}