import type { 
  ApiResponse, 
  ItemPrice,
  TradingAction,
  TrainingMetrics,
  LearningSession,
  NeuralNetworkConfig,
  AdaptiveLearningConfig 
} from '../types'

const BASE_URL = 'http://localhost:3001/api/ai-trading'

export interface AITradingSession {
  sessionId: string
  sessionName: string
  status: 'TRAINING' | 'PAUSED' | 'COMPLETED' | 'STOPPED'
  networkConfig: NeuralNetworkConfig
  adaptiveConfig: AdaptiveLearningConfig
  createdAt: number
  createdBy: string
}

export interface TrainingProgress {
  session: LearningSession | null
  recentMetrics: TrainingMetrics[]
  performance: Record<string, unknown>
  modelStats: Record<string, unknown>
}

export interface PerformanceAnalytics {
  overall: Record<string, unknown>
  byMarketCondition: Array<{
    condition: string;
    successRate: number;
    totalProfit: number;
  }>
  recentTrends: TrainingMetrics[]
  modelEvolution: Record<string, unknown>
}

export interface TradingSignal {
  itemId: number
  itemName: string
  signal: {
    type: 'BUY' | 'SELL' | 'HOLD'
    strength: number
    confidence: number
    timestamp: number
  }
  indicators: Record<string, unknown>
  flippingOpportunity: Record<string, unknown>
  analysis: {
    volatility: number
    trendStrength: number
    supportResistance: Record<string, unknown>
  }
}

export interface SystemStatus {
  activeSessions: number
  sessions: AITradingSession[]
  defaultConfigs: {
    networkConfig: NeuralNetworkConfig
    adaptiveConfig: AdaptiveLearningConfig
  }
  systemHealth: {
    uptime: number
    memory: Record<string, unknown>
    timestamp: number
  }
}

export class AITradingApi {
  /**
   * Start a new AI trading session
   */
  static async startTradingSession(
    sessionName?: string,
    networkConfig?: NeuralNetworkConfig,
    adaptiveConfig?: AdaptiveLearningConfig
  ): Promise<ApiResponse<AITradingSession>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionName,
          networkConfig,
          adaptiveConfig
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: {} as AITradingSession,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Stop an AI trading session
   */
  static async stopTradingSession(sessionId: string): Promise<ApiResponse<{ sessionId: string, status: string, finalPerformance: Record<string, unknown> }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, status: 'ERROR', finalPerformance: {} },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Pause an AI trading session
   */
  static async pauseTradingSession(sessionId: string): Promise<ApiResponse<{ sessionId: string, status: string }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/pause`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, status: 'ERROR' },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Resume an AI trading session
   */
  static async resumeTradingSession(sessionId: string): Promise<ApiResponse<{ sessionId: string, status: string }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/resume`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, status: 'ERROR' },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Process market data for trading decisions
   */
  static async processMarketData(
    sessionId: string, 
    items: ItemPrice[]
  ): Promise<ApiResponse<{ sessionId: string, processedItems: number, actionsGenerated: number, actions: TradingAction[] }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/process-market-data`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, processedItems: 0, actionsGenerated: 0, actions: [] },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get training progress for a session
   */
  static async getTrainingProgress(sessionId: string): Promise<ApiResponse<TrainingProgress>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/progress`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { session: null, recentMetrics: [], performance: {}, modelStats: {} },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get performance analytics for a session
   */
  static async getPerformanceAnalytics(sessionId: string): Promise<ApiResponse<PerformanceAnalytics>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/analytics`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { overall: {}, byMarketCondition: {}, recentTrends: [], modelEvolution: {} },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Update adaptive configuration
   */
  static async updateAdaptiveConfig(
    sessionId: string, 
    config: Partial<AdaptiveLearningConfig>
  ): Promise<ApiResponse<{ sessionId: string, adaptiveConfig: AdaptiveLearningConfig }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/adaptive-config`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, adaptiveConfig: {} as AdaptiveLearningConfig },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Save AI model
   */
  static async saveModel(sessionId: string): Promise<ApiResponse<{ sessionId: string, modelData: string, modelSize: number, savedAt: number }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/save-model`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, modelData: '', modelSize: 0, savedAt: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Load AI model
   */
  static async loadModel(sessionId: string, modelData: string): Promise<ApiResponse<{ sessionId: string, loadedAt: number }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/load-model`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ modelData })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, loadedAt: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Export training data
   */
  static async exportTrainingData(sessionId: string): Promise<ApiResponse<{ sessionId: string, exportData: Record<string, unknown>, exportedAt: number }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions/${sessionId}/export`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessionId, exportData: {}, exportedAt: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Generate trading signals
   */
  static async generateTradingSignals(items: ItemPrice[]): Promise<ApiResponse<{ signals: TradingSignal[], generatedAt: number, itemsProcessed: number }>> {
    try {
      const response = await fetch(`${BASE_URL}/signals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ items })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { signals: [], generatedAt: 0, itemsProcessed: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get active trading sessions
   */
  static async getActiveSessions(): Promise<ApiResponse<{ sessions: AITradingSession[], totalSessions: number }>> {
    try {
      const response = await fetch(`${BASE_URL}/sessions`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { sessions: [], totalSessions: 0 },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }

  /**
   * Get system status
   */
  static async getSystemStatus(): Promise<ApiResponse<SystemStatus>> {
    try {
      const response = await fetch(`${BASE_URL}/system-status`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      return {
        success: true,
        data: result.data
      }
    } catch (error) {
      return {
        success: false,
        data: { 
          activeSessions: 0, 
          sessions: [], 
          defaultConfigs: { networkConfig: {} as NeuralNetworkConfig, adaptiveConfig: {} as AdaptiveLearningConfig },
          systemHealth: { uptime: 0, memory: {}, timestamp: 0 }
        },
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    }
  }
}