/**
 * 🌐 MongoDB Service for Browser Client
 * 
 * This service handles communication between the browser client and MongoDB
 * through a backend API since MongoDB cannot be directly accessed from browsers.
 */

export interface LiveMonitoringData {
  _id?: string
  timestamp: number
  apiRequests: number
  successRate: number
  itemsProcessed: number
  profit: number
  memoryUsage: number
  responseTime: number
  rateLimitStatus: 'HEALTHY' | 'THROTTLED' | 'COOLDOWN' | 'OVERLOADED'
  itemSelectionEfficiency: number
  dataQuality: number
}

export interface SystemStatus {
  dataCollection: {
    isActive: boolean
    totalCollections: number
    successfulCalls: number
    failedCalls: number
    successRate: string
    uptime: number
    averageResponseTime: string
  }
  apiRateLimiting: {
    status: string
    requestsInLastMinute: number
    requestsInLastHour: number
    maxRequestsPerMinute: number
    maxRequestsPerHour: number
    queueLength: number
    activeRequests: number
    totalRequests: number
    rateLimitedRequests: number
  }
  smartItemSelection: {
    totalSelected: number
    capacity: number
    utilizationPercent: string
    efficiency: string
  }
  persistence: {
    enabled: boolean
    type: string
    mongoConnected: boolean
  }
}

export interface EfficiencyMetrics {
  smartSelection: {
    itemsTracked: number
    totalOSRSItems: number
    reductionPercent: string
    efficiency: string
  }
  apiUsage: {
    respectfulUsage: boolean
    utilizationPercent: string
    totalSavedRequests: string
    compliance: string
  }
  performance: {
    estimatedTimeReduction: string
    reducedMemoryUsage: string
  }
}

export class MongoService {
  private baseUrl: string
  private eventSource: EventSource | null = null

  constructor(baseUrl: string = '/api') {
    this.baseUrl = baseUrl
  }

  /**
   * Get live monitoring data from MongoDB
   */
  async getLiveMonitoringData(limit: number = 50): Promise<LiveMonitoringData[]> {
    try {
      const response = await fetch(`${this.baseUrl}/live-monitoring?limit=${limit}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch live monitoring data:', error)
      // Return empty array instead of mock data
      return []
    }
  }

  /**
   * Get aggregated statistics from MongoDB
   */
  async getAggregatedStats(timeRange: number = 3600000): Promise<Record<string, unknown>> {
    try {
      const response = await fetch(`${this.baseUrl}/aggregated-stats?timeRange=${timeRange}`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch aggregated stats:', error)
      return {}
    }
  }

  /**
   * Get system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      console.log(`🔌 [MongoService.getSystemStatus] Making HTTP request to ${this.baseUrl}/system-status`)
      const startTime = Date.now()
      const response = await fetch(`${this.baseUrl}/system-status`)
      const duration = Date.now() - startTime
      
      console.log(`🔌 [MongoService.getSystemStatus] HTTP response received in ${duration}ms, status: ${response.status}`)
      
      if (!response.ok) {
        console.error(`🔌 [MongoService.getSystemStatus] HTTP error! status: ${response.status}`)
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      console.log(`🔌 [MongoService.getSystemStatus] JSON parsed successfully, returning data`)
      return result
    } catch (error) {
      console.error('❌ [MongoService.getSystemStatus] Failed to fetch system status:', error)
      throw error
    }
  }

  /**
   * Get efficiency metrics
   */
  async getEfficiencyMetrics(): Promise<EfficiencyMetrics> {
    try {
      const response = await fetch(`${this.baseUrl}/efficiency-metrics`)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      return await response.json()
    } catch (error) {
      console.error('Failed to fetch efficiency metrics:', error)
      throw error
    }
  }

  /**
   * Save live monitoring data to MongoDB
   */
  async saveLiveMonitoringData(data: Omit<LiveMonitoringData, '_id'>): Promise<string> {
    try {
      const response = await fetch(`${this.baseUrl}/live-monitoring`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const result = await response.json()
      return result.id
    } catch (error) {
      console.error('Failed to save live monitoring data:', error)
      throw error
    }
  }

  /**
   * Start listening for real-time updates via Server-Sent Events
   */
  startRealTimeUpdates(callback: (data: LiveMonitoringData) => void): void {
    try {
      this.eventSource = new EventSource(`${this.baseUrl}/live-monitoring/stream`)
      
      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          callback(data)
        } catch (error) {
          console.error('Error parsing real-time data:', error)
        }
      }

      this.eventSource.onerror = (error) => {
        console.error('EventSource failed:', error)
        // Fallback to polling if SSE fails
        this.startPolling(callback)
      }

      console.log('🔴 Real-time updates started via Server-Sent Events')
    } catch (error) {
      console.error('Failed to start real-time updates:', error)
      // Fallback to polling
      this.startPolling(callback)
    }
  }

  /**
   * Fallback polling mechanism when SSE is not available
   */
  private startPolling(callback: (data: LiveMonitoringData) => void): void {
    const pollInterval = setInterval(async () => {
      try {
        const data = await this.getLiveMonitoringData(1)
        if (data.length > 0) {
          callback(data[0])
        }
      } catch (error) {
        console.error('Polling failed:', error)
      }
    }, 10000) // Poll every 10 seconds to reduce resource usage

    // Store interval ID for cleanup
    ;(this as { pollInterval?: NodeJS.Timeout }).pollInterval = pollInterval
    console.log('🔄 Fallback to polling for real-time updates')
  }

  /**
   * Stop real-time updates
   */
  stopRealTimeUpdates(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
      console.log('🛑 Real-time updates stopped')
    }

    if ((this as { pollInterval?: NodeJS.Timeout }).pollInterval) {
      clearInterval((this as { pollInterval?: NodeJS.Timeout }).pollInterval)
      ;(this as { pollInterval?: NodeJS.Timeout }).pollInterval = undefined
      console.log('🛑 Polling stopped')
    }
  }




}

// Environment-based configuration
const API_CONFIG = {
  nodeBackend: import.meta.env.VITE_NODE_API_URL || 'http://localhost:3001'
}

// Export singleton instance with environment-based URL
export const mongoService = new MongoService(`${API_CONFIG.nodeBackend}/api`)