export function formatPrice(price: number | null): string {
  if (price === null) return 'N/A'
  
  if (price >= 1_000_000) {
    return `${(price / 1_000_000).toFixed(1)}M gp`
  }
  
  if (price >= 1_000) {
    return `${(price / 1_000).toFixed(1)}K gp`
  }
  
  return `${price.toLocaleString()} gp`
}

export function formatPercentage(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleString()
}