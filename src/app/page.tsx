import Sidebar from "@/components/Sidebar";
import PrismPrompt from "@/components/PrismPrompt";
import TokenRow from "@/components/TokenRow";
import TrendingCrawl from "@/components/TrendingCrawl";

export default function Home() {
  return (
    <div className="relative flex min-h-screen bg-[#0a0a0c] font-inter text-white overflow-hidden">
      {/* Ambient lighting layers */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-[#0a0a0c] via-[#0f0f11] to-[#0d0d0f]" />
      
      {/* Radial light sources */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-radial from-[#3bb0ff10] to-transparent opacity-30" />
      <div className="absolute bottom-0 right-1/3 w-80 h-80 bg-gradient-radial from-[#3bff7510] to-transparent opacity-20" />
      
      {/* Enhanced grid pattern with depth */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle,_#1a1a1c_1px,_transparent_1px)] bg-[size:32px_32px] opacity-8" />
      <div className="absolute inset-0 z-0 bg-[radial-gradient(circle,_#2a2a2e_1px,_transparent_1px)] bg-[size:64px_64px] opacity-4" />

      {/* Main layout grid */}
      <div className="relative z-10 flex w-full min-h-screen">
        <Sidebar />

        <main className="flex-1 flex flex-col min-w-0">
          <TrendingCrawl />

          <div className="flex-1 p-6 lg:p-8 flex flex-col">
            <div className="max-w-7xl mx-auto w-full flex-1 flex flex-col">
              {/* PrismPrompt takes up most of the space */}
              <div className="flex-1 mb-10">
                <PrismPrompt />
              </div>

              {/* Token cards section pushed to bottom */}
              <section className="flex-shrink-0">
                <h2 className="text-sm text-gray-400 uppercase tracking-widest mb-8 font-medium">Suggested Tokens</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  <TokenRow
                    name="MAP"
                    change="+13.2%"
                    holders="227"
                    volume="$384K"
                    tags={["New Deploy", "Smart Money"]}
                  />
                  <TokenRow
                    name="WOOF"
                    change="+9.8%"
                    holders="112"
                    volume="$220K"
                    tags={["Low Cap", "Trending"]}
                  />
                  <TokenRow
                    name="MARS"
                    change="+17.3%"
                    holders="340"
                    volume="$410K"
                    tags={["Whale Buys", "Volatility"]}
                  />
                </div>
              </section>
            </div>
        </div>
      </main>
      </div>
    </div>
  );
}
