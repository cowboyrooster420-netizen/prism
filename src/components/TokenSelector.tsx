'use client'

import { useState, useEffect, useRef } from 'react';
import { useAvailableTokens } from '../hooks/useOHLCVData';

interface Token {
  address: string;
  symbol?: string;
  name?: string;
  dataPoints?: number;
}

interface TokenSelectorProps {
  selectedToken: string;
  onTokenSelect: (tokenAddress: string, token: Token) => void;
  className?: string;
}

export default function TokenSelector({ 
  selectedToken, 
  onTokenSelect, 
  className = '' 
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const { tokens, loading, error, refresh } = useAvailableTokens();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter tokens based on search query
  const filteredTokens = tokens.filter(token => {
    const query = searchQuery.toLowerCase();
    return (
      token.address.toLowerCase().includes(query) ||
      token.symbol?.toLowerCase().includes(query) ||
      token.name?.toLowerCase().includes(query)
    );
  });

  // Get selected token info
  const selectedTokenInfo = tokens.find(t => t.address === selectedToken);

  const handleTokenSelect = (token: Token) => {
    onTokenSelect(token.address, token);
    setIsOpen(false);
    setSearchQuery('');
  };

  const formatTokenDisplay = (token: Token) => {
    if (token.symbol) {
      return `${token.symbol} • ${token.address.slice(0, 8)}...`;
    }
    return `${token.address.slice(0, 8)}...${token.address.slice(-4)}`;
  };

  const formatTokenName = (token: Token) => {
    if (token.name && token.symbol) {
      return `${token.symbol} - ${token.name}`;
    }
    if (token.symbol) {
      return token.symbol;
    }
    return `${token.address.slice(0, 12)}...${token.address.slice(-8)}`;
  };

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* Selector Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-between w-full px-4 py-2 bg-gray-800 text-white rounded-lg border border-gray-600 hover:border-gray-500 focus:border-blue-500 focus:outline-none transition-colors"
      >
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-green-400 rounded-full"></div>
          <span className="text-sm font-medium">
            {selectedTokenInfo ? formatTokenDisplay(selectedTokenInfo) : 'Select Token'}
          </span>
        </div>
        
        <svg 
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg z-50 max-h-96 overflow-hidden">
          {/* Search Input */}
          <div className="p-3 border-b border-gray-600">
            <div className="relative">
              <input
                type="text"
                placeholder="Search tokens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 text-white rounded border border-gray-600 focus:border-blue-500 focus:outline-none text-sm"
                autoFocus
              />
              <svg 
                className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="p-4 text-center text-gray-400">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading tokens...</span>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-4 text-center">
              <div className="text-red-400 text-sm mb-2">{error}</div>
              <button
                onClick={refresh}
                className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600 transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Token List */}
          {!loading && !error && (
            <div className="max-h-64 overflow-y-auto">
              {filteredTokens.length === 0 ? (
                <div className="p-4 text-center text-gray-400 text-sm">
                  {searchQuery ? 'No tokens found matching your search' : 'No tokens available'}
                </div>
              ) : (
                <div className="py-1">
                  {filteredTokens.map((token) => (
                    <button
                      key={token.address}
                      onClick={() => handleTokenSelect(token)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-700 transition-colors ${
                        token.address === selectedToken ? 'bg-gray-700 border-r-2 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-white font-medium text-sm">
                            {formatTokenName(token)}
                          </div>
                          <div className="text-gray-400 text-xs mt-1">
                            {token.address}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {token.dataPoints && (
                            <div className="text-gray-300 text-xs">
                              {token.dataPoints.toLocaleString()} candles
                            </div>
                          )}
                          <div className="flex items-center space-x-1 mt-1">
                            <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
                            <span className="text-gray-400 text-xs">Active</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          {!loading && !error && filteredTokens.length > 0 && (
            <div className="p-3 border-t border-gray-600 bg-gray-750">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <span>{filteredTokens.length} tokens available</span>
                <button
                  onClick={refresh}
                  className="text-blue-400 hover:text-blue-300 transition-colors"
                >
                  Refresh
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}