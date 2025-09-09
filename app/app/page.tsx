'use client';

import { QueryInterface } from '@/components/consensus/query-interface'
import { Header } from '@/components/ui/header'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'
import { PROJECT_NAME } from '@/lib/config/branding'

function AppPageContent() {
  const searchParams = useSearchParams();
  const isGuestMode = searchParams.get('mode') === 'guest';
  const [guestSession, setGuestSession] = useState(false);
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isGuestMode) {
      setGuestSession(true);
    }
  }, [isGuestMode]);

  // Redirect non-authenticated users to home page (unless in guest mode)
  useEffect(() => {
    if (!loading && !user && !isGuestMode) {
      router.push('/?redirect=app');
    }
  }, [user, loading, isGuestMode, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (guestSession) {
    return <GuestApp />;
  }

  // Show main app for authenticated users
  if (user) {
    return <MainApp userTier="free" />;
  }

  // This should rarely be reached due to the redirect above
  return null;
}

function GuestApp() {
  return (
    <MainApp userTier="guest" />
  );
}

interface MainAppProps {
  userTier: 'guest' | 'free' | 'pro' | 'max';
}

function MainApp({ userTier }: MainAppProps) {
  // TESTING FEATURE: Pro mode unlock for testing all agents
  // TODO: Remove this before production deployment
  const [isProModeUnlocked, setIsProModeUnlocked] = useState(false);
  const effectiveTier = isProModeUnlocked ? 'pro' : userTier;
  
  const tierDisplay = {
    guest: "Guest Mode - Free Models Only",
    free: "Free Tier - 5 Premium Queries Daily", 
    pro: "Pro Tier - Unlimited Access",
    max: "Max Tier - All Features"
  };

  const tierColors = {
    guest: "text-gray-300 bg-gray-800",
    free: "text-green-400 bg-green-900/20",
    pro: "text-blue-400 bg-blue-900/20", 
    max: "text-purple-400 bg-purple-900/20"
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              {PROJECT_NAME}
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Multi-Model AI Decision Engine
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Query multiple AI models simultaneously and analyze their consensus. 
              Get better insights by comparing responses from top AI providers.
            </p>
            
            {/* Tier Display */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${tierColors[effectiveTier]}`}>
              {tierDisplay[effectiveTier]}
              {isProModeUnlocked && (
                <span className="ml-2 text-yellow-400">🔓 TESTING MODE</span>
              )}
            </div>
            
            {/* TESTING FEATURE: Pro Mode Unlock Button */}
            {(userTier === 'guest' || userTier === 'free') && !isProModeUnlocked && (
              <div className="mt-4">
                <button
                  onClick={() => setIsProModeUnlocked(true)}
                  className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <span className="mr-2">🔐</span>
                  Unlock Pro Mode (Testing)
                </button>
                <p className="text-xs text-gray-500 mt-2">
                  For testing purposes only - unlock all AI models temporarily
                </p>
              </div>
            )}
            
            {isProModeUnlocked && (
              <div className="mt-4">
                <button
                  onClick={() => setIsProModeUnlocked(false)}
                  className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200"
                >
                  <span className="mr-2">🔒</span>
                  Disable Pro Mode
                </button>
                <p className="text-xs text-yellow-500 mt-2">
                  ⚠️ Testing mode active - all premium models unlocked
                </p>
              </div>
            )}
            
            {userTier === 'guest' && !isProModeUnlocked && (
              <p className="text-sm text-gray-500 mt-2">
                Trying free models only. <a href="/auth?mode=signup" className="text-blue-600 hover:underline">Sign up</a> for access to premium models like GPT-4 and Claude.
              </p>
            )}
          </div>
          
          <QueryInterface testingTierOverride={isProModeUnlocked ? 'pro' : undefined} />
        </div>
      </main>
    </div>
  )
}

export default function AppPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    }>
      <AppPageContent />
    </Suspense>
  )
}
