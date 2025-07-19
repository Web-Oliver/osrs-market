import type { OSRSItem, PriceData, ApiResponse } from '../types'

// Environment-based configuration
const API_CONFIG = {
  osrsWiki: import.meta.env.VITE_OSRS_WIKI_API_URL || 'https://prices.runescape.wiki/api/v1/osrs'
}

const BASE_URL = API_CONFIG.osrsWiki

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

  static async searchItems(query?: string): Promise<ApiResponse<OSRSItem[]>> {
    try {
      // Call the Node.js backend to search items
      const backendUrl = import.meta.env.VITE_NODE_API_URL || 'http://localhost:3001';
      const searchUrl = query 
        ? `${backendUrl}/api/items/search?q=${encodeURIComponent(query)}`
        : `${backendUrl}/api/items`;
      
      const response = await fetch(searchUrl);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      return {
        success: true,
        data: data.items || data || []
      };
    } catch (error) {
      console.error('Error searching items:', error);
      return {
        success: false,
        data: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}