import TopNavigation from "@/components/TopNavigation";
import TrendingCrawl from "@/components/TrendingCrawl";
import CompactPrismPrompt from "@/components/CompactPrismPrompt";
import EdgePipeline from "@/components/EdgePipeline";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-[#111111] font-inter text-white overflow-hidden">
      
      {/* Top Navigation */}
      <TopNavigation />
      
      {/* Main Content */}
      <div className="flex flex-col">
        {/* Trending Scroll */}
        <TrendingCrawl />

        {/* Pipeline Content */}
        <div className="flex-1 p-6 lg:p-8">
          <div className="max-w-7xl mx-auto w-full">
            
            {/* AI Chat Box - Compact and collapsible */}
            <div className="mb-6">
              <CompactPrismPrompt />
            </div>
            
            {/* Edge Pipeline - Systematic Opportunity Detection */}
            <div className="min-h-[600px]">
              <EdgePipeline />
            </div>
            
          </div>
        </div>
      </div>
    </div>
  );
}
