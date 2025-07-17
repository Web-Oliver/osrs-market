import type { ItemPrice } from '../types'

interface ItemCardProps {
  item: ItemPrice
}

export function ItemCard({ item }: ItemCardProps) {
  const formatPrice = (price: number | null): string => {
    if (price === null) return 'N/A'
    return price.toLocaleString() + ' gp'
  }

  return (
    <div className="item-card">
      <div className="item-header">
        <h3>{item.name}</h3>
        {item.members && <span className="members-badge">Members</span>}
      </div>
      
      <div className="price-info">
        <div className="price-row">
          <span>High:</span>
          <span className="price high">{formatPrice(item.priceData.high)}</span>
        </div>
        <div className="price-row">
          <span>Low:</span>
          <span className="price low">{formatPrice(item.priceData.low)}</span>
        </div>
      </div>
      
      {item.description && (
        <p className="item-description">{item.description}</p>
      )}
    </div>
  )
}