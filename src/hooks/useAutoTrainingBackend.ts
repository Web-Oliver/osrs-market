import { useState, useEffect, useCallback } from 'react'
import type { AutoTrainingConfig } from '../types/autoTraining'

// Environment-based configuration
const API_CONFIG = {
  nodeBackend: import.meta.env.VITE_NODE_API_URL || 'http://localhost:3001'
}

const BASE_URL = `${API_CONFIG.nodeBackend}/api/auto-training`

export interface AutoTrainingStats {
  isRunning: boolean
  sessionId: string | null
  dataCollection: {
    status: string
    totalCollections: number
    lastCollection: string | null
    memoryUsage: string
  }
  training: {
    session: Record<string, unknown> | null
    metrics: Record<string, unknown>[]
    performance: Record<string, unknown> | null
    modelStats: Record<string, unknown> | null
  }
  analytics: Record<string, unknown> | null
}

export interface AutoTrainingBackendState {
  isLoading: boolean
  error: string | null
  isRunning: boolean
  stats: AutoTrainingStats | null
  config: AutoTrainingConfig | null
  healthStatus: Record<string, unknown> | null
}

export const useAutoTrainingBackend = () => {
  const [state, setState] = useState<AutoTrainingBackendState>({
    isLoading: false,
    error: null,
    isRunning: false,
    stats: null,
    config: null,
    healthStatus: null
  })

  /**
   * Start auto training service
   */
  const startAutoTraining = useCallback(async (config?: Partial<AutoTrainingConfig>): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ config })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to start auto training')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRunning: true,
        stats: result.data.status
      }))

      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return false
    }
  }, [])

  /**
   * Stop auto training service
   */
  const stopAutoTraining = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/stop`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to stop auto training')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        isRunning: false,
        stats: result.data.finalStatus
      }))

      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return false
    }
  }, [])

  /**
   * Get auto training status
   */
  const getAutoTrainingStatus = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/status`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get auto training status')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        stats: result.data.status,
        config: result.data.config,
        healthStatus: result.data.healthStatus,
        isRunning: result.data.status?.isRunning || false
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [])

  /**
   * Update auto training configuration
   */
  const updateAutoTrainingConfig = useCallback(async (config: Partial<AutoTrainingConfig>): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/config`, {
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
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to update auto training config')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        config: result.data.updatedConfig
      }))

      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return false
    }
  }, [])

  /**
   * Manually trigger training cycle
   */
  const triggerTrainingCycle = useCallback(async (): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/trigger`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to trigger training cycle')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        stats: result.data.status
      }))

      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return false
    }
  }, [])

  /**
   * Export training report
   */
  const exportTrainingReport = useCallback(async (): Promise<Record<string, unknown> | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/report`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to export training report')
      }

      setState(prev => ({ ...prev, isLoading: false }))

      // Create downloadable file
      const blob = new Blob([JSON.stringify(result.data.report, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `osrs-auto-training-report-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      return result.data.report
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [])

  /**
   * Save AI model
   */
  const saveModel = useCallback(async (): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/model/save`, {
        method: 'POST'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to save model')
      }

      setState(prev => ({ ...prev, isLoading: false }))

      // Save to localStorage
      localStorage.setItem('osrs-auto-training-model', result.data.modelData)
      localStorage.setItem('osrs-auto-training-model-timestamp', Date.now().toString())

      return result.data.modelData
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [])

  /**
   * Load AI model
   */
  const loadModel = useCallback(async (modelData: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/model/load`, {
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
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to load model')
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return true
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return false
    }
  }, [])

  /**
   * Get historical data
   */
  const getHistoricalData = useCallback(async (itemId?: number, timeRange?: number): Promise<Record<string, unknown>[] | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const queryParams = new URLSearchParams()
      if (itemId) queryParams.append('itemId', itemId.toString())
      if (timeRange) queryParams.append('timeRange', timeRange.toString())

      const response = await fetch(`${BASE_URL}/data/historical?${queryParams}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get historical data')
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return result.data.historicalData
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [])

  /**
   * Get item timeseries
   */
  const getItemTimeseries = useCallback(async (itemId: number): Promise<Record<string, unknown>[] | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/data/timeseries/${itemId}`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get item timeseries')
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return result.data.timeseries
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [])

  /**
   * Get system health
   */
  const getSystemHealth = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await fetch(`${BASE_URL}/health`)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to get system health')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        healthStatus: result.data
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Auto-refresh status when running (disabled to prevent infinite loops)
   * Status updates will be handled manually when needed
   */
  // useEffect removed to prevent infinite re-render loops
  // Manual status fetching is available through getAutoTrainingStatus()

  return {
    ...state,
    startAutoTraining,
    stopAutoTraining,
    getAutoTrainingStatus,
    updateAutoTrainingConfig,
    triggerTrainingCycle,
    exportTrainingReport,
    saveModel,
    loadModel,
    getHistoricalData,
    getItemTimeseries,
    getSystemHealth,
    clearError
  }
}