'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Check, Zap, Shield, DollarSign, Brain, Users, ArrowRight } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-gray-900 dark:to-gray-800">
      {/* Hero Section */}
      <div className="container mx-auto px-4 pt-16 pb-24">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            AI Council
          </h1>
          <p className="text-xl md:text-2xl text-gray-600 dark:text-gray-300 mb-4 font-medium">
            Why ask one AI when you can ask them all?
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-12 max-w-3xl mx-auto">
            Get consensus from multiple AI models for better decisions, fewer mistakes, lower costs
          </p>
          
          {/* Interactive Query Box */}
          <div className="max-w-2xl mx-auto mb-8">
            <div className="relative">
              <div className="w-full px-6 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300 cursor-default select-none">
                {demoQuery}
              </div>
              <Button 
                onClick={scrollToDemo}
                className="absolute right-2 top-2 bottom-2 px-6"
              >
                Ask Council
              </Button>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onTryGuest}
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-3"
            >
              Try as Guest
            </Button>
            <Button 
              onClick={onSignIn}
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-3"
            >
              Sign In
            </Button>
            <Button 
              onClick={onSignUp}
              size="lg"
              className="text-lg px-8 py-3"
            >
              Sign Up Free
            </Button>
          </div>
        </div>
      </div>

      {/* Value Demonstration */}
      <div id="ai-council-demo" className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">See AI Council in Action</h2>
          
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="text-xl">Query: "{demoQuery}"</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Consensus Result */}
              <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
                    🎯 STRONG CONSENSUS ({demoResults.agreement})
                  </h3>
                  <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                    {demoResults.confidence}% Confident
                  </Badge>
                </div>
                <p className="text-lg text-gray-700 dark:text-gray-300 mb-4">"{demoResults.consensus}"</p>
                
                <div className="grid md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <DollarSign className="h-5 w-5" />
                    <span>💰 COST SAVINGS: ${demoResults.costSavings}/month</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Shield className="h-5 w-5" />
                    <span>🛡️ ERROR REDUCTION: Cross-validated</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                    <Zap className="h-5 w-5" />
                    <span>⚡ TIME SAVED: One query vs 5</span>
                  </div>
                </div>
              </div>

              {/* Confidence Score */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Consensus Confidence</span>
                  <span className="text-sm text-gray-600">{demoResults.confidence}%</span>
                </div>
                <Progress value={demoResults.confidence} className="h-3" />
              </div>

              {/* Individual Model Responses */}
              <h4 className="font-semibold mb-4 text-gray-900 dark:text-gray-100">DETAILED BREAKDOWN:</h4>
              <div className="space-y-3">
                {demoResults.models.map((model, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800">
                    <div className="mt-1">
                      {model.agrees ? (
                        <Check className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">⚠️</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{model.name}</div>
                      <div className="text-gray-600 dark:text-gray-400 text-sm">{model.response}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-secondary dark:bg-gray-900 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">How It Works</h2>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🔍</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Ask your question once</h3>
              <p className="text-muted-foreground dark:text-gray-300">Type your question into our interface - no need to visit multiple AI platforms</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">AI Council queries 5+ models</h3>
              <p className="text-muted-foreground dark:text-gray-300">We simultaneously ask GPT-4, Claude, Gemini, and other top AI models</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-950/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl">📊</span>
              </div>
              <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Get consensus analysis</h3>
              <p className="text-muted-foreground dark:text-gray-300">Receive unified insights with confidence scores and detailed breakdowns</p>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Comparison */}
      <div className="py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">Cost Comparison</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-gray-200 dark:border-gray-700">
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-gray-100">Individual AI Subscriptions</CardTitle>
                <CardDescription className="text-center text-gray-600 dark:text-gray-400 font-medium">
                  Multiple bills, scattered insights
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-900 dark:text-gray-100">
                    <span>ChatGPT Plus</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-gray-100">
                    <span>Claude Pro</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-gray-100">
                    <span>Gemini Advanced</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-gray-100">
                    <span>Perplexity Pro</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between text-gray-900 dark:text-gray-100">
                    <span>Groq Plus</span>
                    <span>$18/month</span>
                  </div>
                  <div className="flex justify-between text-gray-500 dark:text-gray-400 text-sm">
                    <span>+ Time switching platforms</span>
                    <span>Priceless</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-bold text-lg">
                    <span className="text-gray-900 dark:text-gray-100">Total</span>
                    <span className="text-gray-900 dark:text-gray-100">$98/month</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 ring-1 ring-gray-900/5 dark:ring-gray-100/5">
              <CardHeader>
                <CardTitle className="text-center text-gray-900 dark:text-gray-100">AI Council</CardTitle>
                <CardDescription className="text-center">
                  <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">79% savings</Badge>
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-900 dark:text-gray-100">
                    <span>Top models (keeps updated)</span>
                    <span>$20/month</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>✓ GPT-4o, Claude-3.5, Gemini-Pro+</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>✓ Consensus analysis engine</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>✓ Hallucination detection</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>✓ Confidence scoring</span>
                    <span>Included</span>
                  </div>
                  <div className="flex justify-between text-gray-600 dark:text-gray-400">
                    <span>✓ Cost optimization per query</span>
                    <span>Included</span>
                  </div>
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-3 flex justify-between font-bold text-lg">
                    <span className="text-gray-900 dark:text-gray-100">Total</span>
                    <span className="text-gray-900 dark:text-gray-100">$20/month</span>
                  </div>
                  <div className="text-center pt-2">
                    <Badge className="bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">Save $78/month</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="bg-gray-50 dark:bg-gray-800 py-16">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-gray-100">Why Choose AI Council?</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardContent className="pt-6">
                  <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <div className="text-gray-600 dark:text-gray-400">{feature.icon}</div>
                  </div>
                  <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">{feature.title}</h3>
                  <p className="text-muted-foreground dark:text-gray-300">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Final CTA */}
      <div className="py-16">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Ready to make better decisions with AI consensus?</h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-2xl mx-auto">
            Join thousands of users who trust AI Council for smarter, more reliable AI insights
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              onClick={onTryGuest}
              variant="outline" 
              size="lg"
              className="text-lg px-8 py-3"
            >
              Try Guest Mode
              <span className="text-sm ml-2">- Test with free models, no signup required</span>
            </Button>
            <Button 
              onClick={onSignUp}
              size="lg"
              className="text-lg px-8 py-3"
            >
              Sign Up Free
              <ArrowRight className="ml-2 h-5 w-5" />
              <span className="text-sm ml-2">- 5 premium queries daily</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
