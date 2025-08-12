export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0a0a] via-[#1a1a1a] to-[#0f0f0f] flex items-center justify-center p-4">
      <div className="flex flex-col items-center space-y-4">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-[#2a2a2e] rounded-full animate-spin border-t-glowBlue"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent rounded-full animate-ping border-t-glowPurple opacity-20"></div>
        </div>
        <div className="text-center">
          <h3 className="text-white font-semibold mb-1">Loading...</h3>
          <p className="text-gray-400 text-sm">Please wait while we load your content</p>
        </div>
      </div>
    </div>
  )
}