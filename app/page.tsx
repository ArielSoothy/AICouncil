'use client';

import { QueryInterface } from '@/components/consensus/query-interface'
import { Header } from '@/components/ui/header'
import { AuthWrapper } from '@/components/auth/auth-wrapper'
import { LandingPage } from '@/components/landing/landing-page'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { PROJECT_NAME } from '@/lib/config/branding'
import { useEffect, Suspense } from 'react'

function HomePageContent() {
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
    <AuthWrapper 
      fallback={
        <LandingPage 
          onTryGuest={handleTryGuest}
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
        />
      }
    >
      <MainApp />
    </AuthWrapper>
  )
}

function MainApp() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4 consensus-gradient bg-clip-text text-transparent">
              {PROJECT_NAME}
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Multi-Model AI Decision Engine
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Query multiple AI models simultaneously and analyze their consensus. 
              Get better insights by comparing responses from OpenAI, Anthropic, Google AI and more.
            </p>
          </div>
          
          <QueryInterface />
        </div>
      </main>
    </div>
  )
}

export default function HomePage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <HomePageContent />
    </Suspense>
  )
}
