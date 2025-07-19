import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { TrendingUp, TrendingDown, Activity } from 'lucide-react';

interface PriceData {
  timestamp: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
}

interface PriceChartProps {
  data: PriceData[];
  itemName: string;
  className?: string;
}

const PriceChart: React.FC<PriceChartProps> = ({ data, itemName, className = '' }) => {
  // Format data for charts
  const chartData = data.map(point => ({
    timestamp: point.timestamp,
    date: new Date(point.timestamp).toLocaleDateString(),
    time: new Date(point.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    high: point.highPrice,
    low: point.lowPrice,
    mid: (point.highPrice + point.lowPrice) / 2,
    volume: point.volume,
    spread: point.highPrice - point.lowPrice
  }));

  // Calculate statistics
  const currentPrice = chartData[chartData.length - 1]?.mid || 0;
  const previousPrice = chartData[chartData.length - 2]?.mid || currentPrice;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = previousPrice !== 0 ? (priceChange / previousPrice) * 100 : 0;
  const isPositive = priceChange >= 0;

  const formatGP = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold text-gray-900">{data.date}</p>
          <p className="text-sm text-gray-600">{data.time}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm">
              <span className="text-green-600">High: </span>
              <span className="font-semibold">{formatGP(data.high)} GP</span>
            </p>
            <p className="text-sm">
              <span className="text-red-600">Low: </span>
              <span className="font-semibold">{formatGP(data.low)} GP</span>
            </p>
            <p className="text-sm">
              <span className="text-blue-600">Volume: </span>
              <span className="font-semibold">{formatGP(data.volume)}</span>
            </p>
            <p className="text-sm">
              <span className="text-purple-600">Spread: </span>
              <span className="font-semibold">{formatGP(data.spread)} GP</span>
            </p>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 ${className}`}>
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{itemName} Price Chart</h3>
            <p className="text-sm text-gray-600">Real-time market data</p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-gray-900">{formatGP(currentPrice)} GP</p>
            <div className={`flex items-center justify-end space-x-1 ${
              isPositive ? 'text-green-600' : 'text-red-600'
            }`}>
              {isPositive ? (
                <TrendingUp className="w-4 h-4" />
              ) : (
                <TrendingDown className="w-4 h-4" />
              )}
              <span className="text-sm font-semibold">
                {isPositive ? '+' : ''}{formatGP(priceChange)} GP
              </span>
              <span className="text-xs">
                ({isPositive ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Tabs */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex space-x-1">
          <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm font-medium">
            Price
          </button>
          <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors">
            Volume
          </button>
          <button className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-300 transition-colors">
            Spread
          </button>
        </div>
      </div>

      {/* Price Chart */}
      <div className="p-6">
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="highGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10B981" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#10B981" stopOpacity={0.1}/>
                </linearGradient>
                <linearGradient id="lowGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#EF4444" stopOpacity={0.1}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
              <XAxis 
                dataKey="time"
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#D1D5DB' }}
              />
              <YAxis 
                tickFormatter={formatGP}
                tick={{ fontSize: 12, fill: '#6B7280' }}
                axisLine={{ stroke: '#D1D5DB' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="high"
                stroke="#10B981"
                strokeWidth={2}
                fill="url(#highGradient)"
                name="High Price"
              />
              <Area
                type="monotone"
                dataKey="low"
                stroke="#EF4444"
                strokeWidth={2}
                fill="url(#lowGradient)"
                name="Low Price"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart Stats */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">24h High</p>
            <p className="font-semibold text-green-600">
              {formatGP(Math.max(...chartData.map(d => d.high)))} GP
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">24h Low</p>
            <p className="font-semibold text-red-600">
              {formatGP(Math.min(...chartData.map(d => d.low)))} GP
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Avg Volume</p>
            <p className="font-semibold text-blue-600">
              {formatGP(chartData.reduce((sum, d) => sum + d.volume, 0) / chartData.length)}
            </p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Data Points</p>
            <p className="font-semibold text-gray-700 flex items-center justify-center">
              <Activity className="w-4 h-4 mr-1" />
              {chartData.length}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PriceChart;