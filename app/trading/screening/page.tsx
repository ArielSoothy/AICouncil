import PreMarketScreening from '@/components/trading/PreMarketScreening'

export default function ScreeningPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <PreMarketScreening />
    </div>
  )
}

export const metadata = {
  title: 'Pre-Market Screening | Verdict AI Trading',
  description: 'AI-powered pre-market stock screening with TWS API data and composite scoring',
}
