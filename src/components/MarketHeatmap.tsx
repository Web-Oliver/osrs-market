import React, { useMemo } from 'react';
// import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface HeatmapItem {
  itemId: number;
  name: string;
  icon: string;
  marginPercent: number;
  volume: number;
  riskScore: number;
  expectedProfitPerHour: number;
}

interface MarketHeatmapProps {
  items: HeatmapItem[];
  className?: string;
}

const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ items, className = '' }) => {
  // Sort items by profit per hour and take top 20
  const topItems = useMemo(() => {
    return [...items]
      .sort((a, b) => b.expectedProfitPerHour - a.expectedProfitPerHour)
      .slice(0, 20);
  }, [items]);

  // Calculate size and color for each item
  const getItemData = (item: HeatmapItem) => {
    const maxProfit = Math.max(...topItems.map(i => i.expectedProfitPerHour));
    const minProfit = Math.min(...topItems.map(i => i.expectedProfitPerHour));
    const profitRange = maxProfit - minProfit;
    
    // Size based on profit per hour (20px to 120px)
    const sizePercent = profitRange === 0 ? 0.5 : (item.expectedProfitPerHour - minProfit) / profitRange;
    const size = Math.max(60, Math.min(120, 60 + sizePercent * 60));
    
    // Color based on margin percentage
    let colorClass = 'bg-gray-500';
    if (item.marginPercent > 5) colorClass = 'bg-green-500';
    else if (item.marginPercent > 2) colorClass = 'bg-green-400';
    else if (item.marginPercent > 1) colorClass = 'bg-yellow-500';
    else if (item.marginPercent > 0) colorClass = 'bg-orange-500';
    else colorClass = 'bg-red-500';
    
    // Opacity based on volume (higher volume = higher opacity)
    const maxVolume = Math.max(...topItems.map(i => i.volume));
    const volumePercent = maxVolume === 0 ? 0.3 : item.volume / maxVolume;
    const opacity = Math.max(0.3, Math.min(1, 0.4 + volumePercent * 0.6));
    
    return { size, colorClass, opacity };
  };

  const formatGP = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const getItemImageUrl = (item: HeatmapItem) => {
    if (item.icon) {
      return `https://oldschool.runescape.wiki/images/${item.icon}`;
    }
    return `https://oldschool.runescape.wiki/images/thumb/${item.name.replace(/ /g, '_')}.png/32px-${item.name.replace(/ /g, '_')}.png`;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Market Opportunity Heatmap</h3>
            <p className="text-sm text-gray-600">Bubble size = Profit/Hour • Color = Margin % • Opacity = Volume</p>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-gray-600">High Margin</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-gray-600">Medium Margin</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-gray-600">Low Margin</span>
            </div>
          </div>
        </div>
      </div>

      {/* Heatmap */}
      <div className="p-6">
        <div className="relative h-96 bg-gray-50 rounded-lg overflow-hidden">
          {topItems.map((item, index) => {
            const { size, colorClass, opacity } = getItemData(item);
            
            // Position items in a grid-like pattern with some randomness
            const cols = 5;
            const rows = 4;
            const col = index % cols;
            const row = Math.floor(index / cols);
            const baseX = (col + 0.5) / cols * 100;
            const baseY = (row + 0.5) / rows * 100;
            
            // Add some randomness to prevent perfect grid
            const randomX = (Math.random() - 0.5) * 10;
            const randomY = (Math.random() - 0.5) * 10;
            
            const x = Math.max(5, Math.min(95, baseX + randomX));
            const y = Math.max(5, Math.min(95, baseY + randomY));

            return (
              <div
                key={item.itemId}
                className="absolute transform -translate-x-1/2 -translate-y-1/2 group cursor-pointer"
                style={{
                  left: `${x}%`,
                  top: `${y}%`,
                  zIndex: 10 + index
                }}
              >
                {/* Bubble */}
                <div
                  className={`${colorClass} rounded-full flex items-center justify-center transition-all duration-300 hover:scale-110 hover:shadow-lg`}
                  style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    opacity
                  }}
                >
                  <img
                    src={getItemImageUrl(item)}
                    alt={item.name}
                    className="w-1/2 h-1/2 object-contain"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/api/placeholder/32/32';
                    }}
                  />
                </div>

                {/* Tooltip */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                  <div className="bg-gray-900 text-white text-xs rounded-lg py-2 px-3 whitespace-nowrap">
                    <div className="font-semibold">{item.name}</div>
                    <div className="mt-1 space-y-1">
                      <div className="flex items-center justify-between space-x-4">
                        <span>Profit/Hr:</span>
                        <span className="font-semibold text-green-400">
                          {formatGP(item.expectedProfitPerHour)} GP
                        </span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span>Margin:</span>
                        <span className={`font-semibold ${
                          item.marginPercent > 2 ? 'text-green-400' :
                          item.marginPercent > 0 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {item.marginPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span>Volume:</span>
                        <span className="font-semibold text-blue-400">
                          {formatGP(item.volume)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between space-x-4">
                        <span>Risk:</span>
                        <span className={`font-semibold ${
                          item.riskScore < 30 ? 'text-green-400' :
                          item.riskScore < 70 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {item.riskScore.toFixed(0)}
                        </span>
                      </div>
                    </div>
                    
                    {/* Tooltip arrow */}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Bubble Size</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-blue-500 rounded-full opacity-70"></div>
                <span className="text-gray-600">Large = High Profit/Hour</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-500 rounded-full opacity-70"></div>
                <span className="text-gray-600">Small = Low Profit/Hour</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Color Scale</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                <span className="text-gray-600">&gt;5% Margin</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-600">1-5% Margin</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                <span className="text-gray-600">&lt;1% Margin</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-900 mb-2">Opacity</h4>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full opacity-100"></div>
                <span className="text-gray-600">High Volume</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-500 rounded-full opacity-50"></div>
                <span className="text-gray-600">Low Volume</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MarketHeatmap;