import { useState, useEffect } from 'react'
import type { ItemPrice } from '../types'

export function useItemPrices() {
  const [items, setItems] = useState<ItemPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Mock data for now - replace with actual API call
        const mockData: ItemPrice[] = [
          {
            id: 4151,
            name: 'Abyssal whip',
            description: 'A weapon from the abyss.',
            members: true,
            tradeable: true,
            stackable: false,
            noted: false,
            grandExchange: true,
            priceData: {
              high: 3200000,
              low: 3150000
            }
          }
        ]
        
        setItems(mockData)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch prices')
      } finally {
        setLoading(false)
      }
    }

    fetchPrices()
  }, [])

  return { items, loading, error, refetch: () => {} }
}