export default function TrendingCrawl() {
  return (
    <div className="w-full bg-gradient-to-r from-[#151517]/80 via-[#1a1a1c]/60 to-[#151517]/80 border-b border-[#2a2a2e]/30 text-sm py-4 backdrop-blur-xl relative overflow-hidden">
      {/* Ambient glow effect */}
      <div className="absolute inset-0 bg-gradient-to-r from-glowBlue/5 via-transparent to-glowPurple/5 opacity-30" />
      
      <div className="relative z-10 flex items-center">
        <div className="flex items-center gap-2 mr-8 flex-shrink-0 z-20 relative">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-gray-400 font-semibold tracking-widest text-xs uppercase">Trending</span>
        </div>
        
        <div className="flex-1 overflow-hidden">
          <div className="animate-scroll flex items-center whitespace-nowrap">
            <span className="text-white mr-8 font-medium">$MAP <span className="text-green-400">+13.2%</span></span>
            <span className="text-white mr-8 font-medium">$WOOF <span className="text-green-400">+9.8%</span></span>
            <span className="text-white mr-8 font-medium">$MARS <span className="text-green-400">+17.3%</span></span>
            <span className="text-white mr-8 font-medium">$SOL <span className="text-green-400">+2.4%</span></span>
            <span className="text-white mr-8 font-medium">$BONK <span className="text-green-400">+5.2%</span></span>
            <span className="text-white mr-8 font-medium">$JUP <span className="text-green-400">+1.8%</span></span>
            <span className="text-white mr-8 font-medium">$RAY <span className="text-green-400">+3.1%</span></span>
            <span className="text-white mr-8 font-medium">$SRM <span className="text-green-400">+0.9%</span></span>
            
            {/* Duplicate for seamless loop */}
            <span className="text-white mr-8 font-medium">$MAP <span className="text-green-400">+13.2%</span></span>
            <span className="text-white mr-8 font-medium">$WOOF <span className="text-green-400">+9.8%</span></span>
            <span className="text-white mr-8 font-medium">$MARS <span className="text-green-400">+17.3%</span></span>
            <span className="text-white mr-8 font-medium">$SOL <span className="text-green-400">+2.4%</span></span>
            <span className="text-white mr-8 font-medium">$BONK <span className="text-green-400">+5.2%</span></span>
            <span className="text-white mr-8 font-medium">$JUP <span className="text-green-400">+1.8%</span></span>
            <span className="text-white mr-8 font-medium">$RAY <span className="text-green-400">+3.1%</span></span>
            <span className="text-white mr-8 font-medium">$SRM <span className="text-green-400">+0.9%</span></span>
          </div>
        </div>
      </div>
    </div>
  );
} 