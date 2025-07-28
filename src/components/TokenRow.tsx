interface TokenRowProps {
  name: string;
  change: string;
  holders: string;
  volume: string;
  tags: string[];
}

export default function TokenRow({ name, change, holders, volume, tags }: TokenRowProps) {
  return (
    <div className="bg-glass border border-[#2a2a2e] rounded-xl p-6 transition-all hover:shadow-glow hover:border-glowBlue group backdrop-blur">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-xl font-semibold text-white">{name}</h2>
        <span className="text-glowGreen font-medium">{change}</span>
      </div>

      <p className="text-sm text-gray-400 mb-4">{holders} holders · {volume} volume</p>

      <div className="flex flex-wrap gap-2 mb-4">
        {tags.map((tag, i) => (
          <span
            key={i}
            className="bg-[#2a2a2e] border border-[#3a3a3f] text-xs text-white px-3 py-1 rounded-full"
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="flex justify-end gap-4 text-xs text-gray-400 group-hover:text-white transition">
        <button className="hover:underline hover:text-glowBlue">View Token</button>
        <button className="hover:underline hover:text-glowBlue">Add to Watchlist</button>
      </div>
    </div>
  );
} 