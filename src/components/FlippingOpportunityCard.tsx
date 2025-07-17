import type { FlippingOpportunity } from '../types/trading'
import { formatPrice } from '../utils/formatters'

interface FlippingOpportunityCardProps {
  opportunity: FlippingOpportunity
  onAddToWatchlist?: (itemId: number) => void
}

export function FlippingOpportunityCard({ opportunity, onAddToWatchlist }: FlippingOpportunityCardProps) {
  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'LOW': return 'text-green-600 bg-green-100'
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
      case 'HIGH': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getROIColor = (roi: number) => {
    if (roi >= 15) return 'text-green-600 font-bold'
    if (roi >= 8) return 'text-green-500'
    if (roi >= 5) return 'text-yellow-600'
    return 'text-gray-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{opportunity.itemName}</h3>
          <p className="text-sm text-gray-500">ID: {opportunity.itemId}</p>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(opportunity.riskLevel)}`}>
          {opportunity.riskLevel} RISK
        </span>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <p className="text-sm text-gray-500">Buy Price</p>
          <p className="text-lg font-semibold text-red-600">{formatPrice(opportunity.buyPrice)}</p>
        </div>
        <div>
          <p className="text-sm text-gray-500">Sell Price</p>
          <p className="text-lg font-semibold text-green-600">{formatPrice(opportunity.sellPrice)}</p>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="text-center">
          <p className="text-xs text-gray-500">Profit</p>
          <p className="font-semibold text-green-600">{formatPrice(opportunity.profitGP)}</p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">ROI</p>
          <p className={`font-semibold ${getROIColor(opportunity.roi)}`}>
            {opportunity.roi.toFixed(1)}%
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Time</p>
          <p className="font-semibold text-blue-600">{Math.round(opportunity.timeToFlip)}m</p>
        </div>
      </div>

      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
        <div>
          <p className="text-xs text-gray-500">Spread</p>
          <p className="font-medium">{opportunity.spreadPercentage.toFixed(2)}%</p>
        </div>
        
        {onAddToWatchlist && (
          <button
            onClick={() => onAddToWatchlist(opportunity.itemId)}
            className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            Add to Watchlist
          </button>
        )}
      </div>
    </div>
  )
}