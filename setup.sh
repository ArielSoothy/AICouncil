#!/bin/bash

# Consensus AI Setup Script
echo "🚀 Setting up Consensus AI..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18+ and try again."
    exit 1
fi

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ is required. Current version: $(node -v)"
    exit 1
fi

echo "✅ Node.js $(node -v) detected"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create environment file if it doesn't exist
if [ ! -f .env.local ]; then
    if [ -f .env.local.example ]; then
        echo "📝 Creating .env.local from .env.local.example..."
        cp .env.local.example .env.local
    elif [ -f .env.example ]; then
        echo "📝 Creating .env.local from .env.example..."
        cp .env.example .env.local
    else
        echo "📝 Creating minimal .env.local..."
        cat > .env.local << 'EOF'
# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI Providers (optional)
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
GOOGLE_GENERATIVE_AI_API_KEY=
GROQ_API_KEY=
XAI_API_KEY=
PERPLEXITY_API_KEY=
MISTRAL_API_KEY=
COHERE_API_KEY=

# NextAuth (optional)
NEXTAUTH_SECRET=
NEXTAUTH_URL=http://localhost:3000
EOF
    fi
    echo "⚠️  Please edit .env.local with your API keys before running the app"
else
    echo "✅ .env.local already exists"
fi

# Build the project to check for errors
echo "🔨 Building project..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Setup complete!"
    echo ""
    echo "Next steps:"
    echo "1. Edit .env.local with your API keys"
    echo "2. Run 'npm run dev' to start the development server"
    echo "3. Open http://localhost:3000"
    echo ""
    echo "Need help? Check DEVELOPMENT.md for detailed instructions."
else
    echo "❌ Build failed. Check the errors above and try again."
    exit 1
fi
