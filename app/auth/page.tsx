'use client'

import { Suspense } from 'react'
import { AuthForms } from '@/components/auth/auth-forms'
import { Header } from '@/components/ui/header'

export default function AuthPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
        <AuthForms />
      </Suspense>
    </div>
  )
}