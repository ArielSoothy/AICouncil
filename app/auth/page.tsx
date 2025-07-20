'use client'

import { useSearchParams } from 'next/navigation'
import { AuthForms } from '@/components/auth/auth-forms'
import { Header } from '@/components/ui/header'

export default function AuthPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <AuthForms />
    </div>
  )
}