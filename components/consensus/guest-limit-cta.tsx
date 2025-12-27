'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Sparkles, CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import { BRANDING } from '@/lib/config/branding'

interface GuestLimitCTAProps {
  queriesUsed: number
  maxFreeQueries: number
}

export function GuestLimitCTA({ queriesUsed, maxFreeQueries }: GuestLimitCTAProps) {
  return (
    <Card className="border-primary/50 bg-primary/5">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle>You've used all your free debates!</CardTitle>
        </div>
        <CardDescription>
          You've completed {queriesUsed} of {maxFreeQueries} free AI debates. Sign up to continue getting better answers through multi-model discussions.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h4 className="font-semibold text-sm">What you get with a free account:</h4>
          <ul className="space-y-1 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>10 free debate credits per month</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Access to all AI models (Claude, GPT, Gemini, and more)</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>Save and share your debates</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
              <span>View verdict synthesis and consensus analysis</span>
            </li>
          </ul>
        </div>

        <div className="flex gap-2">
          <Link href="/auth?mode=signup" className="flex-1">
            <Button className="w-full" size="lg">
              <Sparkles className="mr-2 h-4 w-4" />
              Get Started Free
            </Button>
          </Link>
          <Link href="/auth" className="flex-1">
            <Button variant="outline" className="w-full" size="lg">
              Sign In
            </Button>
          </Link>
        </div>

        <p className="text-xs text-center text-muted-foreground">
          No credit card required • Upgrade anytime for unlimited debates
        </p>
      </CardContent>
    </Card>
  )
}
