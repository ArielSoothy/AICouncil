import { QueryInterface } from '@/components/consensus/query-interface'
import { Header } from '@/components/ui/header'
import { AuthWrapper } from '@/components/auth/auth-wrapper'

export default function HomePage() {
  return (
    <AuthWrapper fallback={<LandingPage />}>
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold tracking-tight mb-4 consensus-gradient bg-clip-text text-transparent">
                Consensus AI
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
    </AuthWrapper>
  )
}

function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-12">
            <h1 className="text-5xl font-bold tracking-tight mb-6 consensus-gradient bg-clip-text text-transparent">
              Consensus AI
            </h1>
            <p className="text-2xl text-muted-foreground mb-4">
              Multi-Model AI Decision Engine
            </p>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto mb-8">
              Get better insights by querying multiple AI models simultaneously. 
              Compare responses from OpenAI, Anthropic, Google AI and analyze their consensus.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-12">
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">🤖 Multi-Model</h3>
              <p className="text-muted-foreground">Query GPT, Claude, and Gemini simultaneously for comprehensive insights</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">📊 Consensus Analysis</h3>
              <p className="text-muted-foreground">See where AI models agree and disagree with confidence scoring</p>
            </div>
            <div className="bg-white/70 backdrop-blur-sm rounded-lg p-6 shadow-sm">
              <h3 className="text-xl font-semibold mb-3">💾 Save History</h3>
              <p className="text-muted-foreground">Keep track of all your queries and responses in your personal dashboard</p>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-lg p-8 shadow-sm">
            <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
            <p className="text-muted-foreground mb-6">
              Join our pilot program and experience the power of AI consensus analysis.
            </p>
            <div className="text-sm text-muted-foreground">
              Sign up or sign in to start using Consensus AI →
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
