import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { AuthProvider } from '@/contexts/auth-context'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Consensus AI - Multi-Model Decision Engine',
  description: 'Query multiple AI models simultaneously and analyze their consensus',
  keywords: ['AI', 'consensus', 'multi-model', 'OpenAI', 'Anthropic', 'Google'],
  authors: [{ name: 'Consensus AI Team' }],
  viewport: 'width=device-width, initial-scale=1',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen bg-background font-sans antialiased">
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  )
}
