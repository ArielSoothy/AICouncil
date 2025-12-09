import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth-context'
import { GlobalModelTierProvider } from '@/contexts/trading-preset-context'
import { Toaster } from '@/components/ui/toaster'
import { PROJECT_TITLE, BRANDING } from '@/lib/config/branding'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: PROJECT_TITLE,
  description: BRANDING.META_DESCRIPTION,
  keywords: BRANDING.META_KEYWORDS,
  authors: [{ name: `${BRANDING.PROJECT_NAME} Team` }],
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={inter.className}>
        <AuthProvider>
          <GlobalModelTierProvider>
            <div className="min-h-screen bg-background font-sans antialiased">
              {children}
              <Toaster />
            </div>
          </GlobalModelTierProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
