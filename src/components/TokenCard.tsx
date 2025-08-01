interface TokenCardProps {
  token: {
    id: string;
    name: string;
    symbol: string;
    mint_address: string;
    price?: number;
    price_change_24h?: number;
    volume_24h?: number;
    market_cap?: number;
    liquidity?: number;
    updated_at?: string;
  };
  onClick?: (token: TokenCardProps['token']) => void;
}

export default function TokenCard({ token, onClick }: TokenCardProps) {
  const isPositive = (token.price_change_24h || 0) >= 0;
  
  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return price < 0.01 ? `$${price.toFixed(6)}` : `$${price.toFixed(4)}`;
  };

  const formatVolume = (volume?: number) => {
    if (!volume) return 'N/A';
    if (volume >= 1000000) return `$${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `$${(volume / 1000).toFixed(1)}K`;
    return `$${volume.toFixed(0)}`;
  };

  const formatMarketCap = (mc?: number) => {
    if (!mc) return 'N/A';
    if (mc >= 1000000000) return `$${(mc / 1000000000).toFixed(2)}B`;
    if (mc >= 1000000) return `$${(mc / 1000000).toFixed(1)}M`;
    if (mc >= 1000) return `$${(mc / 1000).toFixed(1)}K`;
    return `$${mc.toFixed(0)}`;
  };

  const formatLiquidity = (liq?: number) => {
    if (!liq) return 'N/A';
    if (liq >= 1000000) return `$${(liq / 1000000).toFixed(1)}M`;
    if (liq >= 1000) return `$${(liq / 1000).toFixed(1)}K`;
    return `$${liq.toFixed(0)}`;
  };

  const getTimeAgo = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  return (
    <div 
      className={`group relative bg-gradient-to-br from-[#1b1b1f]/90 via-[#161618]/80 to-[#121214]/90 border border-[#2a2a2e]/50 rounded-2xl p-6 transition-all duration-300 backdrop-blur-sm ${
        onClick 
          ? 'hover:shadow-[0_0_30px_rgba(59,176,255,0.15)] hover:scale-[1.02] hover:border-[#3a3a3f]/50 cursor-pointer' 
          : ''
      }`}
      onClick={() => onClick?.(token)}
    >
      {/* Ambient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 via-transparent to-glowPurple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]" />
      
      <div className="relative z-10">
        {/* Header with token name and price change */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-white tracking-tight mb-1 group-hover:text-glowBlue transition-colors duration-300 truncate">
              {token.name}
            </h2>
            <p className="text-sm text-gray-400 font-medium mb-1">
              {token.symbol}
            </p>
            <p className="text-xs text-gray-500 font-mono">
              {token.mint_address.slice(0, 8)}...{token.mint_address.slice(-8)}
            </p>
          </div>
          <div className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-semibold ${
            isPositive 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-green-400' : 'bg-red-400'}`} />
            {token.price_change_24h ? `${isPositive ? '+' : ''}${token.price_change_24h.toFixed(2)}%` : 'N/A'}
          </div>
        </div>

        {/* Price and key metrics */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-[#1a1a1f]/60 rounded-lg p-3 border border-[#2a2a2e]/30">
            <p className="text-xs text-gray-400 mb-1">Price</p>
            <p className="text-lg font-bold text-white">{formatPrice(token.price)}</p>
          </div>
          <div className="bg-[#1a1a1f]/60 rounded-lg p-3 border border-[#2a2a2e]/30">
            <p className="text-xs text-gray-400 mb-1">Market Cap</p>
            <p className="text-lg font-bold text-glowGreen">{formatMarketCap(token.market_cap)}</p>
          </div>
        </div>

        {/* Volume and Liquidity */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-xs text-gray-400 mb-1">24h Volume</p>
            <p className="text-sm font-semibold text-glowBlue">{formatVolume(token.volume_24h)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400 mb-1">Liquidity</p>
            <p className="text-sm font-semibold text-glowPurple">{formatLiquidity(token.liquidity)}</p>
          </div>
        </div>

        {/* Last updated */}
        <div className="text-xs text-gray-500 mb-4">
          Updated: {getTimeAgo(token.updated_at)}
        </div>

        {/* Action buttons */}
        {onClick && (
          <div className="flex justify-between items-center pt-2 border-t border-[#2a2a2e]/30">
            <button className="text-xs text-gray-500 hover:text-glowBlue transition-colors duration-200 font-medium tracking-wide">
              View Details
            </button>
            <button className="text-xs text-gray-500 hover:text-glowBlue transition-colors duration-200 font-medium tracking-wide">
              Add to Watchlist
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 