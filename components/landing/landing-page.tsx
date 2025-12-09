'use client';

import React from 'react';
import { Check, Zap, Shield, DollarSign, Brain, Users, ArrowRight } from 'lucide-react';
import { PROJECT_NAME, TAGLINE_PRIMARY, TAGLINE_SECONDARY, BRANDING } from '@/lib/config/branding';

interface LandingPageProps {
  onTryGuest: () => void;
  onSignIn: () => void;
  onSignUp: () => void;
}

export function LandingPage({ onTryGuest, onSignIn, onSignUp }: LandingPageProps) {
  const demoQuery = "Should I quit my job to start a company?";
  
  const scrollToDemo = () => {
    const demoSection = document.getElementById('ai-council-demo');
    if (demoSection) {
      demoSection.scrollIntoView({ behavior: 'smooth' });
    }
  };
  
  const demoResults = {
    consensus: "Build financial runway first",
    confidence: 85,
    agreement: "4/5 models agree",
    costSavings: 78,
    models: [
      { name: "Claude-3.5-Sonnet", response: "Emphasize 6-month financial planning", agrees: true },
      { name: "GPT-4o", response: "Research market opportunity first", agrees: true },
      { name: "Gemini-Pro", response: "Build emergency fund before transition", agrees: true },
      { name: "Groq-Llama", response: "Consider personal risk tolerance", agrees: false },
      { name: "Mixtral", response: "Validate business idea with customers", agrees: true },
    ]
  };

  const features = [
    {
      icon: <Brain className="h-6 w-6" />,
      title: "Ensemble Intelligence",
      description: "87% more accurate insights by leveraging model diversity and expertise weighting"
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Hallucination Detection",
      description: "73% reduction in false information through cross-model validation and consensus scoring"
    },
    {
      icon: <DollarSign className="h-6 w-6" />,
      title: "Smart Cost Optimization",
      description: "Auto-routes to most cost-effective models per query type - save up to 79% vs multiple subscriptions"
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Time Multiplication",
      description: "Query 5+ top AI models simultaneously in 3 seconds vs 15+ minutes manually"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Consensus Confidence",
      description: "See exactly where AIs agree/disagree with quantified confidence scores (0-100%)"
    },
    {
      icon: <Check className="h-6 w-6" />,
      title: "Decision Quality Boost",
      description: "Users report 92% higher confidence in decisions backed by multi-model consensus"
    }
  ];

  return (
    <div className="min-h-screen openai-hero">
      {/* Hero Section */}
      <div className="openai-container pt-20 pb-32">
        <div className="text-center mb-16">
          <h1 className="openai-title mb-8 openai-gradient-text">
            {PROJECT_NAME}
          </h1>
          <p className="text-2xl md:text-3xl openai-heading mb-6">
            {TAGLINE_PRIMARY}
          </p>
          <p className="openai-body mb-16 max-w-4xl mx-auto">
            {TAGLINE_SECONDARY}
          </p>
          
          {/* Interactive Query Box */}
          <div className="max-w-3xl mx-auto mb-12">
            <div className="relative">
              <div className="openai-input text-lg cursor-default select-none pr-36">
                {demoQuery}
              </div>
              <button 
                onClick={scrollToDemo}
                className="openai-button-primary absolute right-2 top-2 bottom-2 px-8"
              >
                {BRANDING.ACTION_VERBS.ASK}
              </button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-6 justify-center">
            <button 
              onClick={onTryGuest}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '9999px',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '500',
                minWidth: '140px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Try as Guest
            </button>
            <button 
              onClick={onSignIn}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '9999px',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '500',
                minWidth: '140px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Sign In
            </button>
            <button 
              onClick={onSignUp}
              style={{
                background: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '9999px',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '500',
                minWidth: '140px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
            >
              Sign Up Free
            </button>
          </div>
        </div>
      </div>

      {/* Value Demonstration */}
      <div id="ai-council-demo" className="openai-section bg-background">
        <div className="openai-container">
          <h2 className="openai-subtitle text-center mb-16">See {PROJECT_NAME} in Action</h2>
          
          <div className="openai-card openai-card-hover mb-12">
            <div className="p-8">
              <h3 className="openai-heading text-2xl mb-8">Query: &ldquo;{demoQuery}&rdquo;</h3>
              {/* Consensus Result */}
              <div className="bg-gray-50 border border-border rounded-xl p-8 mb-8">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="openai-heading text-xl">
                    🎯 STRONG CONSENSUS ({demoResults.agreement})
                  </h4>
                  <span className="openai-badge openai-badge-success">
                    {demoResults.confidence}% Confident
                  </span>
                </div>
                <p className="openai-body text-xl mb-6">&ldquo;{demoResults.consensus}&rdquo;</p>
                
                <div className="openai-grid text-sm">
                  <div className="flex items-center gap-3 openai-text">
                    <DollarSign className="h-5 w-5 text-primary" />
                    <span>💰 COST SAVINGS: ${demoResults.costSavings}/month</span>
                  </div>
                  <div className="flex items-center gap-3 openai-text">
                    <Shield className="h-5 w-5 text-primary" />
                    <span>🛡️ ERROR REDUCTION: Cross-validated</span>
                  </div>
                  <div className="flex items-center gap-3 openai-text">
                    <Zap className="h-5 w-5 text-primary" />
                    <span>⚡ TIME SAVED: One query vs 5</span>
                  </div>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="mb-8">
                <div className="flex items-center justify-between mb-3">
                  <span className="openai-heading">Consensus Confidence</span>
                  <span className="openai-caption">{demoResults.confidence}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-primary h-3 rounded-full transition-all duration-300"
                    style={{ width: `${demoResults.confidence}%` }}
                  ></div>
                </div>
              </div>

              {/* Individual Model Responses */}
              <h4 className="openai-heading mb-6">DETAILED BREAKDOWN:</h4>
              <div className="space-y-4">
                {demoResults.models.map((model, index) => (
                  <div key={index} className="flex items-start gap-4 p-4 border border-border rounded-lg bg-white">
                    <div className="mt-1">
                      {model.agrees ? (
                        <Check className="h-5 w-5 text-primary" />
                      ) : (
                        <span className="text-yellow-500">⚠️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="openai-heading text-sm">{model.name}</div>
                      <div className="openai-text text-sm">{model.response}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="openai-section bg-background">
        <div className="openai-container">
          <h2 className="openai-subtitle text-center mb-16">How It Works</h2>
          <div className="openai-grid max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🔍</span>
              </div>
              <h3 className="openai-heading text-xl mb-4">Ask your question once</h3>
              <p className="openai-text">Type your question into our interface - no need to visit multiple AI platforms</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🤖</span>
              </div>
              <h3 className="openai-heading text-xl mb-4">{PROJECT_NAME} queries 5+ models</h3>
              <p className="openai-text">We simultaneously ask GPT-4, Claude, Gemini, and other top AI models</p>
            </div>
            <div className="text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">📊</span>
              </div>
              <h3 className="openai-heading text-xl mb-4">Get consensus analysis</h3>
              <p className="openai-text">Receive unified insights with confidence scores and detailed breakdowns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="openai-section bg-background">
        <div className="openai-container">
          <h2 className="openai-subtitle text-center mb-16">Cost Comparison</h2>
          <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
            <div className="openai-card">
              <div className="p-8">
                <h3 className="openai-heading text-xl text-center mb-2">Individual AI Subscriptions</h3>
                <p className="openai-text text-center font-medium mb-8">
                  Multiple bills, scattered insights
                </p>
                <div className="space-y-4">
                  <div className="flex justify-between openai-heading">
                    <span>ChatGPT Plus</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between openai-heading">
                    <span>Claude Pro</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between openai-heading">
                    <span>Gemini Advanced</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between openai-heading">
                    <span>Perplexity Pro</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between openai-heading">
                    <span>Groq Plus</span>
                    <span>$18/month</span>
                  </div>
                  <div className="flex justify-between openai-text text-sm">
                    <span>+ Time switching platforms</span>
                    <span>Priceless</span>
                  </div>
                  <div className="border-t border-border pt-4 flex justify-between openai-heading text-lg">
                    <span>Total</span>
                    <span>$98/month</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="openai-card ring-2 ring-primary/20">
              <div className="p-8">
                <h3 className="openai-heading text-xl text-center mb-2">{PROJECT_NAME}</h3>
                <div className="text-center mb-8">
                  <span className="openai-badge openai-badge-success">79% savings</span>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between openai-heading">
                    <span>Top models (keeps updated)</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between openai-text">
                    <span>✓ GPT-4o, Claude-3.5, Gemini-Pro+</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between openai-text">
                    <span>✓ Consensus analysis engine</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between openai-text">
                    <span>✓ Hallucination detection</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between openai-text">
                    <span>✓ Confidence scoring</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between openai-text">
                    <span>✓ Cost optimization per query</span>
                    <span>Included</span>
                  </div>
                  <div className="border-t border-border pt-4 flex justify-between openai-heading text-lg">
                    <span>Total</span>
                    <span>$20/month</span>
                  </div>
                  <div className="text-center pt-3">
                    <span className="openai-badge openai-badge-success">Save $78/month</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="openai-section bg-background">
        <div className="openai-container">
          <h2 className="openai-subtitle text-center mb-16">Why Choose {PROJECT_NAME}?</h2>
          <div className="openai-grid max-w-7xl mx-auto">
            {features.map((feature, index) => (
              <div key={index} className="openai-card text-center">
                <div className="p-8">
                  <div className="w-16 h-16 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-6">
                    <div className="text-primary">{feature.icon}</div>
                  </div>
                  <h3 className="openai-heading text-lg mb-4">{feature.title}</h3>
                  <p className="openai-text">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="openai-section bg-background">
        <div className="openai-container text-center">
          <h2 className="openai-subtitle mb-8">Ready to make better decisions with AI consensus?</h2>
          <p className="openai-body mb-12 max-w-3xl mx-auto">
            Join thousands of users who trust {PROJECT_NAME} for smarter, more reliable AI insights
          </p>
          <div className="flex flex-col lg:flex-row gap-6 justify-center">
            <button 
              onClick={onTryGuest}
              style={{
                background: 'transparent',
                color: 'white',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: '9999px',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
            >
              Try Guest Mode
              <span style={{ fontSize: '14px', marginLeft: '12px', opacity: 0.75 }}>- Test with free models, no signup required</span>
            </button>
            <button 
              onClick={onSignUp}
              style={{
                background: 'white',
                color: 'black',
                border: 'none',
                borderRadius: '9999px',
                padding: '16px 32px',
                fontSize: '18px',
                fontWeight: '500',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = '#f3f4f6';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'white';
                e.currentTarget.style.boxShadow = '0 2px 4px rgba(0, 0, 0, 0.1)';
              }}
            >
              Sign Up Free
              <ArrowRight className="ml-3 h-5 w-5" />
              <span style={{ fontSize: '14px', marginLeft: '12px', opacity: 0.9 }}>- 5 premium queries daily</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
