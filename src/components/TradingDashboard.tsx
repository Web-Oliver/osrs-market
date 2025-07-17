import { useState, useEffect } from 'react'
import { useItemPrices } from '../hooks/useItemPrices'
import { useMarketAnalysis } from '../hooks/useMarketAnalysis'
import { FlippingOpportunityCard } from './FlippingOpportunityCard'

export function TradingDashboard() {
  const { items, loading: itemsLoading, error: itemsError } = useItemPrices()
  const { 
    opportunities, 
    loading: analysisLoading, 
    error: analysisError,
    analyzeItems,
    getTopOpportunities,
    filterOpportunitiesByRisk
  } = useMarketAnalysis()

  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL')
  const [watchlist, setWatchlist] = useState<number[]>([])

  useEffect(() => {
    if (items.length > 0) {
      analyzeItems(items)
    }
  }, [items, analyzeItems])

  const handleAddToWatchlist = (itemId: number) => {
    setWatchlist(prev => [...prev, itemId])
    // Here you would typically save to localStorage or backend
  }

  const filteredOpportunities = selectedRiskFilter === 'ALL' 
    ? opportunities 
    : filterOpportunitiesByRisk(selectedRiskFilter)

  const topOpportunities = getTopOpportunities(10)

  if (itemsLoading || analysisLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing market opportunities...</p>
        </div>
      </div>
    )
  }

  if (itemsError || analysisError) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p>Error: {itemsError || analysisError}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">OSRS Trading Dashboard</h1>
        <p className="text-gray-600">Real-time market analysis and flipping opportunities</p>
      </div>

      {/* Market Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">{opportunities.length}</p>
            <p className="text-sm text-gray-500">Total Opportunities</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">{filterOpportunitiesByRisk('LOW').length}</p>
            <p className="text-sm text-gray-500">Low Risk</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600">{filterOpportunitiesByRisk('MEDIUM').length}</p>
            <p className="text-sm text-gray-500">Medium Risk</p>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{filterOpportunitiesByRisk('HIGH').length}</p>
            <p className="text-sm text-gray-500">High Risk</p>
          </div>
        </div>
      </div>

      {/* Top Opportunities Section */}
      {topOpportunities.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">🏆 Top Opportunities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {topOpportunities.slice(0, 6).map((opportunity) => (
              <FlippingOpportunityCard
                key={opportunity.itemId}
                opportunity={opportunity}
                onAddToWatchlist={handleAddToWatchlist}
              />
            ))}
          </div>
        </div>
      )}

      {/* Risk Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4 border border-gray-200">
        <div className="flex flex-wrap gap-2">
          <span className="text-sm font-medium text-gray-700 py-2">Filter by Risk:</span>
          {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const).map((risk) => (
            <button
              key={risk}
              onClick={() => setSelectedRiskFilter(risk)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                selectedRiskFilter === risk
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {risk}
            </button>
          ))}
        </div>
      </div>

      {/* All Opportunities */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            All Opportunities ({filteredOpportunities.length})
          </h2>
          <div className="text-sm text-gray-500">
            Showing {selectedRiskFilter.toLowerCase()} risk opportunities
          </div>
        </div>
        
        {filteredOpportunities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No opportunities found matching your criteria.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredOpportunities.map((opportunity) => (
              <FlippingOpportunityCard
                key={opportunity.itemId}
                opportunity={opportunity}
                onAddToWatchlist={handleAddToWatchlist}
              />
            ))}
          </div>
        )}
      </div>

      {/* Watchlist Section */}
      {watchlist.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            📋 Watchlist ({watchlist.length} items)
          </h2>
          <div className="flex flex-wrap gap-2">
            {watchlist.map((itemId) => {
              const opportunity = opportunities.find(opp => opp.itemId === itemId)
              return opportunity ? (
                <span
                  key={itemId}
                  className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
                >
                  {opportunity.itemName}
                  <button
                    onClick={() => setWatchlist(prev => prev.filter(id => id !== itemId))}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                  </button>
                </span>
              ) : null
            })}
          </div>
        </div>
      )}
    </div>
  )
}