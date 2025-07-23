'use client';

import { QueryInterface } from '@/components/consensus/query-interface'
import { Header } from '@/components/ui/header'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRouter } from 'next/navigation'

export default function AppPage() {
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
  const tierDisplay = {
    guest: "Guest Mode - Free Models Only",
    free: "Free Tier - 5 Premium Queries Daily", 
    pro: "Pro Tier - Unlimited Access",
    max: "Max Tier - All Features"
  };

  const tierColors = {
    guest: "text-gray-600",
    free: "text-green-600",
    pro: "text-blue-600", 
    max: "text-purple-600"
  };

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold tracking-tight mb-4">
              AI Council
            </h1>
            <p className="text-xl text-muted-foreground mb-2">
              Multi-Model AI Decision Engine
            </p>
            <p className="text-muted-foreground max-w-2xl mx-auto mb-4">
              Query multiple AI models simultaneously and analyze their consensus. 
              Get better insights by comparing responses from top AI providers.
            </p>
            
            {/* Tier Display */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 ${tierColors[userTier]}`}>
              {tierDisplay[userTier]}
            </div>
            
            {userTier === 'guest' && (
              <p className="text-sm text-gray-500 mt-2">
                Trying free models only. <a href="/auth?mode=signup" className="text-blue-600 hover:underline">Sign up</a> for access to premium models like GPT-4 and Claude.
              </p>
            )}
          </div>
          
          <QueryInterface />
        </div>
      </main>
    </div>
  )
}
