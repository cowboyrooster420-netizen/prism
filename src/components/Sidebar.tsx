import { Activity, Star, MessageSquare, Clock, Brain } from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="w-64 min-h-screen bg-gradient-to-b from-[#0b0b0c]/80 to-[#0d0d0e]/90 border-r border-[#1f1f21]/50 backdrop-blur-xl p-8 flex flex-col justify-between shadow-[inset_-1px_0_0_0_rgba(255,255,255,0.05)]">
      <div className="space-y-12">
        <div className="relative">
          <h1 className="text-2xl font-bold tracking-widest text-white bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
            PRISM
          </h1>
          <div className="absolute -bottom-1 left-0 w-8 h-0.5 bg-gradient-to-r from-glowBlue to-transparent rounded-full" />
        </div>

        <nav className="flex flex-col gap-3 text-sm">
          <NavItem icon={<Activity size={18} />} label="Trending" href="/" />
          <NavItem icon={<Brain size={18} />} label="AI Watchlist" href="/watchlist" />
          <NavItem icon={<Star size={18} />} label="My Watchlists" href="/my-watchlists" />
          <NavItem icon={<MessageSquare size={18} />} label="Prism Chat" href="/" />
          <NavItem icon={<Clock size={18} />} label="History" href="/history" />
        </nav>
      </div>

      <div className="text-xs text-gray-500 font-medium tracking-wide">v0.1 alpha</div>
    </aside>
  );
}

function NavItem({ icon, label, href }: { icon: React.ReactNode; label: string; href: string }) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 px-3 py-2.5 rounded-lg text-gray-400 hover:text-white transition-all duration-200 hover:bg-white/5 hover:shadow-[0_0_20px_rgba(59,176,255,0.1)] relative overflow-hidden"
    >
      <div className="relative z-10 transition-transform duration-200 group-hover:scale-110">
        {icon}
      </div>
      <span className="relative z-10 font-medium tracking-wide transition-all duration-200 group-hover:tracking-wider">
        {label}
      </span>
      <div className="absolute inset-0 bg-gradient-to-r from-glowBlue/0 via-glowBlue/5 to-glowBlue/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
    </a>
  );
} 