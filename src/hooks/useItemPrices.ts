import { useState, useEffect } from 'react'
import type { ItemPrice } from '../types'
import { OSRSApi } from '../services/api'

export function useItemPrices() {
  const [items, setItems] = useState<ItemPrice[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        setLoading(true)
        setError(null)
        
        // Fetch real price data from OSRS Wiki API
        const priceResponse = await OSRSApi.getItemPrices()
        
        if (!priceResponse.success) {
          throw new Error(priceResponse.error || 'Failed to fetch prices')
        }
        
        // Convert price data to ItemPrice format
        const priceData = priceResponse.data
        const itemsWithPrices: ItemPrice[] = []
        
        // Add some popular items for display
        const popularItems = [
          { id: 4151, name: 'Abyssal whip', description: 'A weapon from the abyss.', members: true },
          { id: 11802, name: 'Armadyl godsword', description: 'A powerful godsword.', members: true },
          { id: 4712, name: 'Dragon bones', description: 'Remains of a dragon.', members: false },
          { id: 139, name: 'Cooked lobster', description: 'A cooked lobster.', members: false },
          { id: 560, name: 'Death rune', description: 'A rune used for death spells.', members: false }
        ]
        
        for (const item of popularItems) {
          const itemPriceData = priceData[item.id.toString()]
          if (itemPriceData) {
            itemsWithPrices.push({
              id: item.id,
              name: item.name,
              description: item.description,
              members: item.members,
              tradeable: true,
              stackable: item.id === 560 || item.id === 4712, // runes and bones are stackable
              noted: false,
              grandExchange: true,
              priceData: {
                high: itemPriceData.high,
                highTime: itemPriceData.highTime,
                low: itemPriceData.low,
                lowTime: itemPriceData.lowTime,
                timestamp: Date.now()
              }
            })
          }
        }
        
        setItems(itemsWithPrices)
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