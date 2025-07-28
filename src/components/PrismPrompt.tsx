export default function PrismPrompt() {
  return (
    <div className="h-full relative rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(59,176,255,0.15)] bg-gradient-to-br from-[#1f1f25] via-[#1a1a1f] to-[#0f0f11] border border-[#2a2a2e]/50 p-[2px] group hover:shadow-[0_0_50px_rgba(59,176,255,0.2)] transition-all duration-500">
      <div className="bg-gradient-to-br from-[#0f0f11]/95 to-[#0a0a0c]/90 backdrop-blur-xl rounded-[inherit] p-8 h-full flex flex-col relative">
        {/* Ambient glow effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-glowBlue/5 via-transparent to-glowPurple/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
        
        <div className="relative z-10 flex flex-col h-full">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-2 h-2 bg-glowBlue rounded-full animate-pulse" />
            <label htmlFor="prism-prompt" className="text-sm text-gray-400 uppercase tracking-widest font-semibold">
              Ask Prism
            </label>
          </div>
          
          <div className="flex-1 flex flex-col">
            <div className="relative mb-6">
              <input
                id="prism-prompt"
                type="text"
                placeholder="e.g. find tokens under 10m mc with whale inflows"
                className="w-full text-white bg-transparent placeholder-gray-500 text-lg outline-none font-inter font-medium leading-relaxed border-b border-[#2a2a2e]/50 focus:border-glowBlue/50 transition-colors duration-300 pb-3"
              />
              <div className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-glowBlue to-glowPurple transition-all duration-300 group-focus-within:w-full" />
            </div>
            
            <div className="flex-1 bg-gradient-to-br from-[#0a0a0c]/80 to-[#0d0d0f]/60 rounded-xl border border-[#2a2a2e]/30 p-6 backdrop-blur-sm relative overflow-hidden">
              {/* Subtle pattern overlay */}
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgba(255,255,255,0.02)_1px,_transparent_0)] bg-[size:20px_20px] opacity-30" />
              
              <div className="relative z-10">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-1.5 bg-glowGreen rounded-full" />
                  <span className="text-gray-400 text-sm font-medium tracking-wide">AI Response</span>
                </div>
                <p className="text-gray-500 text-sm leading-relaxed font-inter">
                  Ready to analyze Solana tokens and market data. Ask me anything about trending tokens, whale movements, or market insights.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 