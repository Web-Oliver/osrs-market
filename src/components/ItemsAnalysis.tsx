import React, { useState, useEffect, useMemo } from 'react';
import { Search, Star, Filter, BarChart3, Activity, Grid, List, Map } from 'lucide-react';
import PriceChart from './PriceChart';
import MetricsCard from './MetricsCard';
import MarketHeatmap from './MarketHeatmap';

interface Item {
  itemId: number;
  name: string;
  examine: string;
  members: boolean;
  lowalch: number;
  highalch: number;
  tradeable_on_ge: boolean;
  stackable: boolean;
  value: number;
  buy_limit: number;
  icon: string;
}

interface MarketData {
  itemId: number;
  highPrice: number;
  lowPrice: number;
  volume: number;
  marginGp: number;
  marginPercent: number;
  rsi: number;
  volatility: number;
  riskScore: number;
  expectedProfitPerHour: number;
}

interface ItemWithMarketData extends Item {
  marketData?: MarketData;
}


const ItemsAnalysis: React.FC = () => {
  const [items, setItems] = useState<ItemWithMarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('profitPerHour');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'heatmap'>('grid');
  const [selectedItem, setSelectedItem] = useState<ItemWithMarketData | null>(null);
  const [favorites, setFavorites] = useState<Set<number>>(new Set());

  // Fetch items and market data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Get popular tradeable items
        const itemsResponse = await fetch('/api/items?limit=50');
        const itemsData = await itemsResponse.json();
        
        if (itemsData.success) {
          // Extract items array from response (handle different API response formats)
          const items = itemsData.data.items || itemsData.data || [];
          
          // Get all item IDs for bulk market data fetch (used for reference only)
          const _itemIds = items
            .filter(item => item && (item.itemId || item.id))
            .map(item => item.itemId || item.id)
            .filter(Boolean);
          
          // Fetch ALL market data from backend in ONE call
          const allMarketData = {};
          try {
            const marketResponse = await fetch('/api/market-data/live');
            if (marketResponse.ok) {
              const marketResult = await marketResponse.json();
              if (marketResult.success && marketResult.data) {
                // Create a map for quick lookup
                Object.entries(marketResult.data).forEach(([itemId, marketData]) => {
                  allMarketData[parseInt(itemId)] = marketData;
                });
              }
            }
          } catch (error) {
            console.error('Failed to fetch market data:', error);
          }
          
          // Map items with their market data
          const itemsWithMarketData = items.map(item => {
            try {
              // Normalize item data
              const normalizedItem = {
                ...item,
                itemId: item.itemId || item.id,
                tradeable_on_ge: item.tradeable_on_ge || item.market?.tradeableOnGE || true,
                members: item.members || false,
                stackable: item.stackable || item.market?.stackable || false,
                buy_limit: item.buy_limit || item.market?.buyLimit,
                value: item.value || item.market?.value || 0,
                highalch: item.highalch || item.alchemy?.highalch || 0,
                lowalch: item.lowalch || item.alchemy?.lowalch || 0
              };
              
              // Check if item has valid itemId
              if (!normalizedItem.itemId) {
                console.warn('Item missing itemId:', item);
                return {
                  ...normalizedItem,
                  marketData: null
                };
              }
              
              // Get market data from our bulk fetch
              const marketData = allMarketData[normalizedItem.itemId];
              
              return {
                ...normalizedItem,
                marketData: marketData || null
              };
            } catch (error) {
              console.error(`Failed to process item:`, error);
              return { 
                ...item, 
                itemId: item.itemId || item.id,
                marketData: null
              };
            }
          });
          
          setItems(itemsWithMarketData);
        }
      } catch (error) {
        console.error('Failed to fetch items:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  // Filter and sort items - backend handles all calculations
  const filteredAndSortedItems = useMemo(() => {
    const filtered = items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = selectedCategory === 'all' || 
        (selectedCategory === 'members' && item.members) ||
        (selectedCategory === 'f2p' && !item.members) ||
        (selectedCategory === 'stackable' && item.stackable) ||
        (selectedCategory === 'tradeable' && item.tradeable_on_ge);
      
      return matchesSearch && matchesCategory;
    });

    // Backend handles all sorting calculations
    filtered.sort((a, b) => {
      const aData = a.marketData;
      const bData = b.marketData;
      
      if (!aData && !bData) return 0;
      if (!aData) return 1;
      if (!bData) return -1;

      // Use backend-calculated values directly
      switch (sortBy) {
        case 'profitPerHour':
          return (bData.expectedProfitPerHour || 0) - (aData.expectedProfitPerHour || 0);
        case 'margin':
          return (bData.marginGp || 0) - (aData.marginGp || 0);
        case 'volume':
          return (bData.volume || 0) - (aData.volume || 0);
        case 'rsi':
          return (bData.rsi || 50) - (aData.rsi || 50);
        case 'risk':
          return (aData.riskScore || 100) - (bData.riskScore || 100);
        default:
          return 0;
      }
    });

    return filtered;
  }, [items, searchTerm, selectedCategory, sortBy]);

  // Format numbers - display only, no calculations
  const formatGP = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  // Get item image URL
  const getItemImageUrl = (item: Item) => {
    if (item.icon) {
      return `https://oldschool.runescape.wiki/images/${item.icon}`;
    }
    return `https://oldschool.runescape.wiki/images/thumb/${item.name.replace(/ /g, '_')}.png/32px-${item.name.replace(/ /g, '_')}.png`;
  };

  // Toggle favorite
  const toggleFavorite = (itemId: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(itemId)) {
      newFavorites.delete(itemId);
    } else {
      newFavorites.add(itemId);
    }
    setFavorites(newFavorites);
  };

  // Intelligent timeseries analysis for high-value items
  const performTimeseriesAnalysis = async (itemId: number, timestep: string = '5m') => {
    try {
      console.log(`Starting timeseries analysis for item ${itemId}`);
      
      const response = await fetch(`/api/market-data/timeseries/${itemId}?timestep=${timestep}`);
      
      if (response.status === 429) {
        const errorData = await response.json();
        console.warn('Timeseries rate limit hit:', errorData.error);
        return null;
      }
      
      if (!response.ok) {
        throw new Error(`Timeseries API returned ${response.status}`);
      }
      
      const result = await response.json();
      
      if (result.success && result.data) {
        console.log(`Timeseries analysis completed for item ${itemId}:`, {
          dataPoints: result.data.dataPoints?.length || 0,
          insights: result.data.insights,
          fromCache: result.fromCache
        });
        
        return result.data;
      }
      
      return null;
    } catch (error) {
      console.error(`Failed to perform timeseries analysis for item ${itemId}:`, error);
      return null;
    }
  };

  const ItemCard: React.FC<{ item: ItemWithMarketData }> = ({ item }) => {
    const marketData = item.marketData;
    const isFavorite = favorites.has(item.itemId);

    return (
      <div className="osrs-card p-6 hover:scale-105 transform transition-all duration-300">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <img
                src={getItemImageUrl(item)}
                alt={item.name}
                className="w-12 h-12 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAxMkMxOC40NzcgMTIgMTQgMTYuNDc3IDE0IDIyVjI2QzE0IDMxLjUyMyAxOC40NzcgMzYgMjQgMzZDMjkuNTIzIDM2IDM0IDMxLjUyMyAzNCAyNlYyMkMzNCAxNi40NzcgMjkuNTIzIDEyIDI0IDEyWiIgZmlsbD0iIzlDQTNBRiIvPgo8L3N2Zz4=';
                }}
              />
              {item.members && (
                <div className="absolute -top-1 -right-1 bg-yellow-500 rounded-full w-4 h-4 flex items-center justify-center text-xs font-bold text-white">
                  M
                </div>
              )}
            </div>
            <div>
              <h3 className="font-bold text-lg text-gray-900 leading-tight">{item.name}</h3>
              <p className="text-sm text-gray-500">ID: {item.itemId}</p>
            </div>
          </div>
          <button
            onClick={() => toggleFavorite(item.itemId)}
            className={`p-2 rounded-full transition-colors ${
              isFavorite ? 'text-yellow-500 bg-yellow-100' : 'text-gray-400 hover:text-yellow-500'
            }`}
          >
            <Star className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
          </button>
        </div>

        {/* Market Data */}
        {marketData ? (
          <div className="space-y-4">
            {/* Price Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-xs text-green-600 font-medium">Buy Price</p>
                <p className="text-lg font-bold text-green-700">{formatGP(marketData.lowPrice)} GP</p>
              </div>
              <div className="bg-red-50 p-3 rounded-lg">
                <p className="text-xs text-red-600 font-medium">Sell Price</p>
                <p className="text-lg font-bold text-red-700">{formatGP(marketData.highPrice)} GP</p>
              </div>
            </div>

            {/* Profit Metrics */}
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Profit Margin</span>
                <span className="osrs-stat-positive">{formatGP(marketData.marginGp)} GP</span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Margin %</span>
                <span className={marketData.marginPercent > 0 ? 'osrs-stat-positive' : 'osrs-stat-negative'}>
                  {formatPercent(marketData.marginPercent)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Profit/Hour</span>
                <span className="osrs-stat-positive">{formatGP(marketData.expectedProfitPerHour)} GP</span>
              </div>
            </div>

            {/* Technical Indicators */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-xs text-gray-600">RSI</p>
                <p className={`font-bold ${
                  marketData.rsi > 70 ? 'text-red-600' : 
                  marketData.rsi < 30 ? 'text-green-600' : 'text-gray-700'
                }`}>
                  {marketData.rsi?.toFixed(0) || 'N/A'}
                </p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-xs text-gray-600">Volume</p>
                <p className="font-bold text-gray-700">{formatGP(marketData.volume)}</p>
              </div>
              <div className="bg-gray-50 p-2 rounded">
                <p className="text-xs text-gray-600">Risk</p>
                <p className={`font-bold ${
                  marketData.riskScore < 30 ? 'text-green-600' :
                  marketData.riskScore < 70 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {marketData.riskScore?.toFixed(0) || 'N/A'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-2">
              <button 
                onClick={() => setSelectedItem(item)}
                className="osrs-button-primary flex-1 text-sm py-2"
              >
                <Activity className="w-4 h-4 inline mr-1" />
                Analyze
              </button>
              <button 
                onClick={() => performTimeseriesAnalysis(item.itemId)}
                className="osrs-button-secondary text-sm py-2 px-3"
                title="Deep timeseries analysis (rate limited)"
              >
                <BarChart3 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No market data available</p>
          </div>
        )}

        {/* Item Properties */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-1">
            {item.tradeable_on_ge && (
              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">GE</span>
            )}
            {item.stackable && (
              <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">Stackable</span>
            )}
            {item.members && (
              <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs rounded-full">Members</span>
            )}
            <span className="px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded-full">
              Limit: {item.buy_limit?.toLocaleString() || 'N/A'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading market analysis...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">OSRS Market Analysis</h1>
          <p className="text-xl text-gray-600">Discover profitable flipping opportunities with visual market insights</p>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="osrs-input pl-10"
              />
            </div>

            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="osrs-input"
            >
              <option value="all">All Items</option>
              <option value="members">Members Only</option>
              <option value="f2p">Free-to-Play</option>
              <option value="stackable">Stackable</option>
              <option value="tradeable">GE Tradeable</option>
            </select>

            {/* Sort By */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="osrs-input"
            >
              <option value="profitPerHour">Profit per Hour</option>
              <option value="margin">Profit Margin</option>
              <option value="volume">Volume</option>
              <option value="rsi">RSI</option>
              <option value="risk">Risk Score</option>
            </select>

            {/* View Mode */}
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-1 ${
                  viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Grid className="w-4 h-4" />
                <span>Grid</span>
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-1 ${
                  viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <List className="w-4 h-4" />
                <span>List</span>
              </button>
              <button
                onClick={() => setViewMode('heatmap')}
                className={`px-3 py-2 rounded-lg transition-colors flex items-center space-x-1 ${
                  viewMode === 'heatmap' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}
              >
                <Map className="w-4 h-4" />
                <span>Heatmap</span>
              </button>
            </div>
          </div>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <MetricsCard
            title="Total Items"
            value={filteredAndSortedItems.length}
            icon="chart"
            subtitle="Market opportunities"
            changeType="neutral"
          />
          <MetricsCard
            title="Avg Profit/Hr"
            value={`${formatGP(
              filteredAndSortedItems
                .filter(item => item.marketData?.expectedProfitPerHour)
                .reduce((sum, item) => sum + (item.marketData?.expectedProfitPerHour || 0), 0) /
              Math.max(1, filteredAndSortedItems.filter(item => item.marketData?.expectedProfitPerHour).length)
            )} GP`}
            icon="trending-up"
            subtitle="Expected returns"
            changeType="positive"
            change={12500}
          />
          <MetricsCard
            title="Favorites"
            value={favorites.size}
            icon="target"
            subtitle="Tracked items"
            changeType="neutral"
          />
          <MetricsCard
            title="High Volume"
            value={filteredAndSortedItems.filter(item => (item.marketData?.volume || 0) > 100).length}
            icon="activity"
            subtitle="Active trading"
            changeType="positive"
            change={3}
          />
        </div>

        {/* Heatmap View */}
        {viewMode === 'heatmap' && (
          <div className="mb-8">
            <MarketHeatmap 
              items={filteredAndSortedItems
                .filter(item => item.marketData)
                .map(item => ({
                  itemId: item.itemId,
                  name: item.name,
                  icon: item.icon,
                  marginPercent: item.marketData!.marginPercent,
                  volume: item.marketData!.volume,
                  riskScore: item.marketData!.riskScore,
                  expectedProfitPerHour: item.marketData!.expectedProfitPerHour
                }))
              }
            />
          </div>
        )}

        {/* Price Chart for Selected Item */}
        {selectedItem && selectedItem.marketData && (
          <div className="mb-8">
            <PriceChart
              data={[
                {
                  timestamp: Date.now() - 24 * 60 * 60 * 1000,
                  highPrice: selectedItem.marketData.highPrice * 0.95,
                  lowPrice: selectedItem.marketData.lowPrice * 0.95,
                  volume: selectedItem.marketData.volume * 0.8
                },
                {
                  timestamp: Date.now() - 12 * 60 * 60 * 1000,
                  highPrice: selectedItem.marketData.highPrice * 0.98,
                  lowPrice: selectedItem.marketData.lowPrice * 0.98,
                  volume: selectedItem.marketData.volume * 0.9
                },
                {
                  timestamp: Date.now(),
                  highPrice: selectedItem.marketData.highPrice,
                  lowPrice: selectedItem.marketData.lowPrice,
                  volume: selectedItem.marketData.volume
                }
              ]}
              itemName={selectedItem.name}
            />
          </div>
        )}

        {/* Items Grid/List */}
        {viewMode !== 'heatmap' && (
          <div className={`grid gap-6 ${
            viewMode === 'grid' 
              ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
              : 'grid-cols-1'
          }`}>
            {filteredAndSortedItems.map((item) => (
              <ItemCard key={item.itemId} item={item} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {filteredAndSortedItems.length === 0 && (
          <div className="text-center py-16">
            <Filter className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No items found</h3>
            <p className="text-gray-600">Try adjusting your search criteria or filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ItemsAnalysis;