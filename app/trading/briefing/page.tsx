'use client'

import { Header } from '@/components/ui/header'
import { DailyBriefing } from '@/components/trading/briefing/daily-briefing'

export default function BriefingPage() {
  return (
    <>
      <Header />
      <div className="container mx-auto px-4 py-8">
        <DailyBriefing />
      </div>
    </>
  )
}
