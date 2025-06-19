import { QueryInterface } from '@/components/consensus/query-interface'
import { Header } from '@/components/ui/header'

export default function HomePage() {
  return (
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
  )
}
