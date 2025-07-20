import { useState, useEffect, useCallback } from 'react'

interface WatchlistItem {
  itemId: number
  itemName: string
  addedDate: string
  currentPrice?: number
  currentMargin?: number
}

interface UseWatchlistReturn {
  watchlist: WatchlistItem[]
  loading: boolean
  error: string | null
  addItemToWatchlist: (itemId: number, itemName: string) => Promise<void>
  removeItemFromWatchlist: (itemId: number) => Promise<void>
  refreshWatchlist: () => Promise<void>
}

const API_BASE_URL = 'http://localhost:3000/api'

export function useWatchlist(): UseWatchlistReturn {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // For now, hardcode a userId until user authentication is implemented
  const userId = 'user_default_001'

  const fetchWatchlist = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/watchlist?userId=${userId}`)
      
      if (!response.ok) {
        throw new Error(`Failed to fetch watchlist: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        setWatchlist(data.data || [])
      } else {
        throw new Error(data.error || 'Failed to fetch watchlist')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error fetching watchlist:', errorMessage)
    } finally {
      setLoading(false)
    }
  }, [userId])

  const addItemToWatchlist = useCallback(async (itemId: number, itemName: string) => {
    try {
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/watchlist`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          itemId,
          itemName,
          addedDate: new Date().toISOString()
        })
      })
      
      if (!response.ok) {
        throw new Error(`Failed to add item to watchlist: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the watchlist to get updated data
        await fetchWatchlist()
      } else {
        throw new Error(data.error || 'Failed to add item to watchlist')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error adding item to watchlist:', errorMessage)
      throw err // Re-throw to allow component to handle the error
    }
  }, [userId, fetchWatchlist])

  const removeItemFromWatchlist = useCallback(async (itemId: number) => {
    try {
      setError(null)
      
      const response = await fetch(`${API_BASE_URL}/watchlist/${itemId}?userId=${userId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error(`Failed to remove item from watchlist: ${response.status}`)
      }
      
      const data = await response.json()
      
      if (data.success) {
        // Refresh the watchlist to get updated data
        await fetchWatchlist()
      } else {
        throw new Error(data.error || 'Failed to remove item from watchlist')
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      console.error('Error removing item from watchlist:', errorMessage)
      throw err // Re-throw to allow component to handle the error
    }
  }, [userId, fetchWatchlist])

  const refreshWatchlist = useCallback(async () => {
    await fetchWatchlist()
  }, [fetchWatchlist])

  // Fetch watchlist on mount
  useEffect(() => {
    fetchWatchlist()
  }, [fetchWatchlist])

  return {
    watchlist,
    loading,
    error,
    addItemToWatchlist,
    removeItemFromWatchlist,
    refreshWatchlist
  }
}