import type { OSRSItem, PriceData, ApiResponse } from '../types'

const BASE_URL = 'https://prices.runescape.wiki/api/v1/osrs'

export class OSRSApi {
  static async getItemPrices(itemIds?: number[]): Promise<ApiResponse<Record<string, PriceData>>> {
    try {
      const url = itemIds && itemIds.length > 0 
        ? `${BASE_URL}/latest?id=${itemIds.join(',')}`
        : `${BASE_URL}/latest`
      
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      
      return {
        success: true,
        data: data.data || {}
      }
    } catch (error) {
      return {
        success: false,
        data: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  static async searchItems(): Promise<ApiResponse<OSRSItem[]>> {
    try {
      // This would typically call an item search API
      // For now, return empty results
      return {
        success: true,
        data: []
      }
    } catch (error) {
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}