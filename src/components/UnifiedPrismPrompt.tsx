/**
 * Enhanced Prism Prompt component with unified crawler integration
 * Replaces the basic PrismPrompt with advanced AI chat capabilities
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Brain, TrendingUp, Rocket, BarChart3, Sparkles } from 'lucide-react';

interface UnifiedAIResponse {
  response: string;
  metadata: {
    intent: any;
    crawlerData: any;
    processingTime: number;
    dataFreshness: string;
    confidence: number;
    cost: number;
    method: 'ai' | 'template' | 'hybrid';
  };
  insights?: {
    keyFindings: string[];
    recommendations: string[];
    alerts?: any[];
  };
  relatedQueries?: string[];
  debugInfo?: any;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: any;
}

export default function UnifiedPrismPrompt() {
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [showDebug, setShowDebug] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Example queries for different categories
  const exampleQueries = {
    behavioral: [
      "Show me tokens with whale activity",
      "Which tokens have new holder growth?",
      "Find smart money movements"
    ],
    volume: [
      "Top volume tokens right now",
      "Show me volume spikes",
      "Trending by trading volume"
    ],
    launchpad: [
      "New launches on pump.fun",
      "Fresh tokens launched today",
      "Early stage gems"
    ],
    ai: [
      "What should I buy right now?",
      "AI recommendations for my portfolio",
      "Best alpha opportunities"
    ]
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: query,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    const currentQuery = query;
    setQuery('');

    try {
      const response = await fetch('/api/unified-ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: currentQuery,
          userId: 'test-user',
          sessionId: Date.now().toString(),
          options: {
            includeRealTime: true,
            responseFormat: 'detailed'
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const aiResponse: UnifiedAIResponse = await response.json();

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse.response,
        timestamp: new Date(),
        metadata: aiResponse.metadata
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);
      
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExampleClick = (exampleQuery: string) => {
    setQuery(exampleQuery);
  };

  const clearChat = () => {
    setMessages([]);
  };

  const getIntentIcon = (intent: string) => {
    switch (intent) {
      case 'behavioral': return <Brain className="w-4 h-4" />;
      case 'volume': return <TrendingUp className="w-4 h-4" />;
      case 'launchpad': return <Rocket className="w-4 h-4" />;
      case 'technical': return <BarChart3 className="w-4 h-4" />;
      case 'ai_recommendations': return <Sparkles className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10">
      {/* Header */}
      <div className="p-6 border-b border-white/10">
        <h2 className="text-2xl font-bold text-white mb-2">
          🔮 Prism AI Chat
        </h2>
        <p className="text-white/70">
          Ask about whale activity, new launches, volume trends, or get AI-powered recommendations
        </p>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={clearChat}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            Clear Chat
          </button>
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="text-sm text-white/60 hover:text-white transition-colors"
          >
            {showDebug ? 'Hide' : 'Show'} Debug Info
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="h-96 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-white/60">
            <p className="mb-6">Start a conversation about Solana tokens...</p>
            
            {/* Example Queries */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
              {Object.entries(exampleQueries).map(([category, queries]) => (
                <div key={category} className="space-y-2">
                  <h4 className="text-sm font-medium text-white/80 capitalize flex items-center gap-2">
                    {getIntentIcon(category)}
                    {category === 'ai' ? 'AI Recommendations' : category}
                  </h4>
                  {queries.map((query, index) => (
                    <button
                      key={index}
                      onClick={() => handleExampleClick(query)}
                      className="block w-full text-left text-sm text-white/60 hover:text-white hover:bg-white/5 p-2 rounded transition-colors"
                    >
&ldquo;{query}&rdquo;
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white/10 text-white border border-white/20'
                }`}
              >
                <div className="whitespace-pre-wrap">{message.content}</div>
                
                {/* Metadata for assistant messages */}
                {message.role === 'assistant' && message.metadata && (
                  <div className="mt-3 pt-3 border-t border-white/20">
                    <div className="flex items-center gap-4 text-xs text-white/60">
                      <span className="flex items-center gap-1">
                        {getIntentIcon(message.metadata.intent?.primary)}
                        {message.metadata.intent?.primary}
                      </span>
                      <span>{message.metadata.processingTime}ms</span>
                      <span className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${
                          message.metadata.confidence > 0.8 ? 'bg-green-400' :
                          message.metadata.confidence > 0.6 ? 'bg-yellow-400' : 'bg-red-400'
                        }`} />
                        {(message.metadata.confidence * 100).toFixed(0)}%
                      </span>
                      <span className="capitalize">{message.metadata.method}</span>
                    </div>
                    
                    {/* Debug Info */}
                    {showDebug && (
                      <details className="mt-2">
                        <summary className="text-xs text-white/40 cursor-pointer">Debug Info</summary>
                        <pre className="text-xs text-white/40 mt-1 overflow-x-auto">
                          {JSON.stringify(message.metadata, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                )}
                
                <div className="text-xs text-white/40 mt-2">
                  {formatTimestamp(message.timestamp)}
                </div>
              </div>
            </div>
          ))
        )}
        
        {/* Loading indicator */}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white/10 rounded-lg p-4 border border-white/20">
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                Analyzing market data...
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form */}
      <div className="p-6 border-t border-white/10">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Ask about whale activity, new launches, volume trends..."
            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !query.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
            {isLoading ? 'Analyzing...' : 'Send'}
          </button>
        </form>
        
        <div className="mt-3 text-xs text-white/40">
          💡 Try asking about behavioral patterns, volume analysis, new launches, or AI recommendations
        </div>
      </div>
    </div>
  );
}