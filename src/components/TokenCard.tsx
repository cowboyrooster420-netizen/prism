interface TokenCardProps {
  name: string;
  change: string;
  holders: string;
  volume: string;
  tags: string[];
}

export default function TokenCard({ name, change, holders, volume, tags }: TokenCardProps) {
  const isPositive = change.startsWith('+');
  
  return (
    <div className="group relative bg-gradient-to-br from-[#1b1b1f]/90 via-[#161618]/80 to-[#121214]/90 border border-[#2a2a2e]/50 rounded-2xl p-6 hover:shadow-[0_0_30px_rgba(59,176,255,0.15)] transition-all duration-300 hover:scale-[1.02] hover:border-[#3a3a3f]/50 backdrop-blur-sm">
      {/* Ambient glow on hover */}
      <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 via-transparent to-glowPurple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-[inherit]" />
      
      <div className="relative z-10">
        {/* Header with token name and change */}
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight mb-1 group-hover:text-glowBlue transition-colors duration-300">
              {name}
            </h2>
            <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
              <span>{holders} holders</span>
              <span className="w-1 h-1 bg-gray-500 rounded-full" />
              <span>{volume} volume</span>
            </div>
          </div>
          <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-semibold ${
            isPositive 
              ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
              : 'bg-red-500/10 text-red-400 border border-red-500/20'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${isPositive ? 'bg-green-400' : 'bg-red-400'}`} />
            {change}
          </div>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-4">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="bg-gradient-to-r from-[#2a2a2e]/80 to-[#3a3a3f]/60 border border-[#4a4a4f]/30 text-xs text-gray-300 px-3 py-1.5 rounded-full font-medium tracking-wide backdrop-blur-sm group-hover:border-[#5a5a5f]/50 transition-all duration-200"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button className="text-xs text-gray-500 hover:text-glowBlue transition-colors duration-200 font-medium tracking-wide">
            View Token
          </button>
          <button className="text-xs text-gray-500 hover:text-glowBlue transition-colors duration-200 font-medium tracking-wide">
            Add to Watchlist
          </button>
        </div>
      </div>
    </div>
  );
} 