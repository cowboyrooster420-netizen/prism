import Sidebar from "@/components/Sidebar";
import PrismPrompt from "@/components/PrismPrompt";
import TrendingCrawl from "@/components/TrendingCrawl";
import TokenList from "@/components/TokenList";

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
                <h2 className="text-sm text-gray-400 uppercase tracking-widest mb-8 font-medium">Tokens Under $5M</h2>
                <TokenList />
              </section>
            </div>
        </div>
      </main>
      </div>
    </div>
  );
}
