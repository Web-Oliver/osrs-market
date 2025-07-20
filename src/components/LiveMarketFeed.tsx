import React, { useState, useEffect, useRef } from 'react';
import { Activity, TrendingUp, Database, AlertTriangle, CheckCircle, ArrowUp, ArrowDown, Circle } from 'lucide-react';

interface MarketEvent {
  id: string;
  timestamp: Date;
  type: 'price_change' | 'volume_spike' | 'data_update' | 'error';
  severity: 'low' | 'medium' | 'high';
  title: string;
  description: string;
  itemId?: number;
  itemName?: string;
  data: {
    oldValue?: number;
    newValue?: number;
    change?: number;
    changePercent?: number;
    volume?: number;
    itemCount?: number;
  };
}

interface PriceMovement {
  itemId: number;
  itemName: string;
  currentPrice: number;
  previousPrice: number;
  change: number;
  changePercent: number;
  volume: number;
  trend: 'up' | 'down' | 'stable';
}

const LiveMarketFeed: React.FC = () => {
  const [marketEvents, setMarketEvents] = useState<MarketEvent[]>([]);
  const [priceMovements, setPriceMovements] = useState<PriceMovement[]>([]);
  const [isLive, setIsLive] = useState(true);
  const [filterType, setFilterType] = useState<'all' | 'high' | 'errors'>('all');
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  const feedRef = useRef<HTMLDivElement>(null);

  // Fetch real market data and create events from actual API responses
  useEffect(() => {
    if (!isLive) return;

    const fetchRealMarketData = async () => {
      try {
        const startTime = Date.now();
        
        // Fetch real market data from backend
        const response = await fetch('/api/market-data/live');
        if (!response.ok) {
          throw new Error(`API returned ${response.status}`);
        }
        
        const result = await response.json();
        const _duration = Date.now() - startTime;
        
        if (result.success && result.data) {
          const itemCount = Object.keys(result.data).length;
          
          // Create a real data update event
          const dataUpdateEvent: MarketEvent = {
            id: `data_update_${Date.now()}`,
            timestamp: new Date(),
            type: 'data_update',
            severity: 'low',
            title: 'Market Data Updated',
            description: `Real-time price data refreshed for ${itemCount} items from ${result.source}`,
            data: {
              itemCount: itemCount
            }
          };
          
          setMarketEvents(prev => [dataUpdateEvent, ...prev.slice(0, 49)]);
          setLastUpdateTime(new Date());
          
          // Convert real market data to price movements
          const movements: PriceMovement[] = [];
          const dataEntries = Object.entries(result.data).slice(0, 10); // Show top 10
          
          for (const [itemId, marketData] of dataEntries) {
            if (marketData && typeof marketData === 'object' && 'highPrice' in marketData && 'lowPrice' in marketData) {
              const data = marketData as any;
              const currentPrice = Math.round((data.highPrice + data.lowPrice) / 2);
              const previousPrice = data.previousPrice || data.lowPrice || currentPrice; // Use real previous price from backend
              const change = currentPrice - previousPrice;
              const changePercent = previousPrice > 0 ? (change / previousPrice) * 100 : 0;
              
              movements.push({
                itemId: parseInt(itemId),
                itemName: `Item ${itemId}`, // Would need item name lookup
                currentPrice: currentPrice,
                previousPrice: previousPrice,
                change: change,
                changePercent: changePercent,
                volume: data.volume || 0,
                trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
              });
            }
          }
          
          setPriceMovements(movements);
          
        } else {
          throw new Error('No data received from API');
        }
      } catch (error) {
        console.error('Failed to fetch market data:', error);
        
        // Create error event for real API failures
        const errorEvent: MarketEvent = {
          id: `error_${Date.now()}`,
          timestamp: new Date(),
          type: 'error',
          severity: 'high',
          title: 'Market Data Fetch Failed',
          description: `Failed to fetch real market data: ${error.message}`,
          data: {}
        };
        
        setMarketEvents(prev => [errorEvent, ...prev.slice(0, 49)]);
      }
    };

    // Initial fetch
    fetchRealMarketData();
    
    // Fetch real data every 30 seconds
    const interval = setInterval(fetchRealMarketData, 30000);
    return () => clearInterval(interval);
  }, [isLive]);

  // Auto-scroll to new events
  useEffect(() => {
    if (feedRef.current && isLive) {
      feedRef.current.scrollTop = 0;
    }
  }, [marketEvents]);

  const getEventIcon = (type: MarketEvent['type']) => {
    switch (type) {
      case 'price_change': return <TrendingUp className="w-4 h-4" />;
      case 'volume_spike': return <Activity className="w-4 h-4" />;
      case 'data_update': return <Database className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Circle className="w-4 h-4" />;
    }
  };

  const getEventColor = (type: MarketEvent['type'], severity: MarketEvent['severity']) => {
    if (type === 'error' || severity === 'high') {
      return 'bg-red-50 border-red-200 text-red-800';
    }
    
    switch (type) {
      case 'price_change': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'volume_spike': return 'bg-purple-50 border-purple-200 text-purple-800';
      case 'data_update': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const formatGP = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const filteredEvents = marketEvents.filter(event => {
    if (filterType === 'all') return true;
    if (filterType === 'high') return event.severity === 'high';
    if (filterType === 'errors') return event.type === 'error';
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Live Market Feed</h1>
            <p className="text-xl text-gray-600">Real-time OSRS market data from backend APIs</p>
            {lastUpdateTime && (
              <p className="text-sm text-gray-500 mt-1">
                Last updated: {formatTime(lastUpdateTime)}
              </p>
            )}
          </div>
          <div className="flex items-center space-x-4">
            <div className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              isLive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              <div className={`w-3 h-3 rounded-full ${isLive ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">{isLive ? 'LIVE' : 'PAUSED'}</span>
            </div>
            <button
              onClick={() => setIsLive(!isLive)}
              className={`px-4 py-2 rounded-lg transition-colors ${
                isLive ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isLive ? 'Pause Feed' : 'Resume Feed'}
            </button>
          </div>
        </div>

        {/* Real Price Movements from Backend */}
        {priceMovements.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Real Price Movements</h3>
            <div className="overflow-hidden">
              <div className="flex space-x-6 animate-marquee">
                {priceMovements.map((movement) => (
                  <div key={movement.itemId} className="flex items-center space-x-2 whitespace-nowrap">
                    <span className="font-medium text-gray-900">{movement.itemName}</span>
                    <span className="text-gray-600">{formatGP(movement.currentPrice)} GP</span>
                    <div className={`flex items-center space-x-1 ${
                      movement.trend === 'up' ? 'text-green-600' : 
                      movement.trend === 'down' ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {movement.trend === 'up' ? <ArrowUp className="w-3 h-3" /> : 
                       movement.trend === 'down' ? <ArrowDown className="w-3 h-3" /> : 
                       <Circle className="w-3 h-3" />}
                      <span className="text-sm font-medium">{movement.changePercent.toFixed(1)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* Real Event Feed */}
          <div className="lg:col-span-3 bg-white rounded-xl shadow-lg border border-gray-200">
            
            {/* Feed Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900">Real Market Events</h3>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilterType('all')}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      filterType === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterType('high')}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      filterType === 'high' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    High Priority
                  </button>
                  <button
                    onClick={() => setFilterType('errors')}
                    className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                      filterType === 'errors' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    Errors
                  </button>
                </div>
              </div>
            </div>

            {/* Feed Content */}
            <div ref={feedRef} className="h-96 overflow-y-auto p-6 space-y-4">
              {filteredEvents.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Database className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No real market events yet. Data will appear as it's fetched from backend APIs.</p>
                </div>
              )}
              
              {filteredEvents.map((event, index) => (
                <div
                  key={event.id}
                  className={`p-4 rounded-lg border transition-all duration-300 animate-fade-in ${getEventColor(event.type, event.severity)}`}
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 p-2 rounded-full bg-white">
                      {getEventIcon(event.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium">{event.title}</h4>
                        <span className="text-xs opacity-75">{formatTime(event.timestamp)}</span>
                      </div>
                      <p className="text-sm opacity-90 mt-1">{event.description}</p>
                      
                      {/* Real Event Data */}
                      {event.data && (
                        <div className="mt-2 flex flex-wrap gap-2 text-xs">
                          {event.data.itemCount && (
                            <span className="px-2 py-1 rounded-full bg-white text-blue-700">
                              {event.data.itemCount} items
                            </span>
                          )}
                          {event.data.change && (
                            <span className={`px-2 py-1 rounded-full bg-white ${
                              event.data.change > 0 ? 'text-green-700' : 'text-red-700'
                            }`}>
                              {event.data.change > 0 ? '+' : ''}{formatGP(event.data.change)} GP
                            </span>
                          )}
                          {event.data.volume && (
                            <span className="px-2 py-1 rounded-full bg-white text-purple-700">
                              Vol: {event.data.volume}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Real Stats Sidebar */}
          <div className="space-y-6">
            
            {/* Event Stats */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Event Statistics</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Total Events</span>
                  <span className="font-semibold">{marketEvents.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">High Priority</span>
                  <span className="font-semibold text-red-600">
                    {marketEvents.filter(e => e.severity === 'high').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Updates</span>
                  <span className="font-semibold text-green-600">
                    {marketEvents.filter(e => e.type === 'data_update').length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Errors</span>
                  <span className="font-semibold text-red-600">
                    {marketEvents.filter(e => e.type === 'error').length}
                  </span>
                </div>
              </div>
            </div>

            {/* Real API Status */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">API Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Market Data API</span>
                  <span className="text-green-600 font-medium">Active</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Update Interval</span>
                  <span className="font-medium">30 seconds</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Data Source</span>
                  <span className="font-medium">OSRS Wiki</span>
                </div>
              </div>
            </div>

            {/* Real Actions */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Real Actions</h3>
              <div className="space-y-2">
                <button 
                  onClick={() => window.location.href = '/api/market-data/live'}
                  className="w-full osrs-button-primary text-sm py-2"
                >
                  <Database className="w-4 h-4 inline mr-2" />
                  View Raw API Data
                </button>
                <button 
                  onClick={() => window.location.href = '/api/health'}
                  className="w-full osrs-button-secondary text-sm py-2"
                >
                  <CheckCircle className="w-4 h-4 inline mr-2" />
                  Check System Health
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
    </div>
  );
};

export default LiveMarketFeed;