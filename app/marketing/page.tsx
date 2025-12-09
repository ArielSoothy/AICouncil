'use client';

import { QueryInterface } from '@/components/consensus/query-interface'
import { Header } from '@/components/ui/header'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { LandingPage } from '@/components/landing/landing-page'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { PROJECT_NAME } from '@/lib/config/branding'
import { useEffect, Suspense } from 'react'

function MarketingPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  // If user is authenticated and there's a redirect parameter, redirect them
  useEffect(() => {
    if (!loading && user) {
      const redirect = searchParams.get('redirect');
      if (redirect === 'app') {
        router.push('/app');
      }
    }
  }, [user, loading, searchParams, router]);

  const handleTryGuest = () => {
    // Create guest session and redirect to main app
    router.push('/app?mode=guest');
  };

  const handleSignIn = () => {
    router.push('/auth?redirect=/app');
  };

  const handleSignUp = () => {
    router.push('/auth?mode=signup&redirect=/app');
  };

  return (
    <LandingPage
      onTryGuest={handleTryGuest}
      onSignIn={handleSignIn}
      onSignUp={handleSignUp}
    />
  )
}

export default function MarketingPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">Loading...</div>}>
      <MarketingPageContent />
    </Suspense>
  )
}