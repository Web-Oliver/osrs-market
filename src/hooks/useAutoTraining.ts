import { useState, useCallback, useEffect } from 'react'
import { useAutoTrainingBackend } from './useAutoTrainingBackend'
import type { AutoTrainingConfig } from '../types/autoTraining'

// Default comprehensive configuration with MongoDB persistence
const DEFAULT_AUTO_TRAINING_CONFIG: AutoTrainingConfig = {
  dataCollection: {
    updateInterval: 300000, // 5 minutes
    maxRetries: 3,
    enableTimeseriesData: true,
    enableMapping: true,
    enableHistoricalData: false,
    enablePersistence: true,
    persistence: {
      type: 'mongodb',
      config: {
        connectionString: 'mongodb://localhost:27017',
        databaseName: 'osrs_market_data',
        options: {
          maxPoolSize: 10,
          serverSelectionTimeoutMS: 5000,
          retryWrites: true,
          w: 'majority'
        }
      }
    },
    itemFilters: {
      minPrice: 1000, // 1k GP minimum
      maxPrice: 100000000, // 100M GP maximum
      membersOnly: false,
      tradeable: true,
      grandExchange: true
    },
    dataRetention: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      maxRecords: 10000
    }
  },
  neuralNetwork: {
    inputSize: 8,
    hiddenLayers: [128, 64, 32],
    outputSize: 3,
    learningRate: 0.001,
    batchSize: 32,
    memorySize: 10000,
    epsilon: 1.0,
    epsilonDecay: 0.995,
    epsilonMin: 0.01,
    gamma: 0.99,
    tau: 0.001
  },
  adaptiveLearning: {
    enableOnlineLearning: true,
    learningFrequency: 50,
    performanceThreshold: 60,
    adaptationRate: 0.1,
    memoryRetention: 0.8,
    explorationBoost: true
  },
  training: {
    enableAutoTraining: true,
    trainingInterval: 120000, // 2 minutes
    minDataPoints: 10,
    batchProcessingSize: 20,
    continuousLearning: true
  },
  itemSelection: {
    enableSmartFiltering: true,
    volumeThreshold: 100,
    priceRangeMin: 5000, // 5k GP minimum for trading
    priceRangeMax: 50000000, // 50M GP maximum for manageable risk
    spreadThreshold: 2, // 2% minimum spread
    maxItemsToTrade: 50
  }
}

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

export function useAutoTraining() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [config, setConfig] = useState<AutoTrainingConfig>(DEFAULT_AUTO_TRAINING_CONFIG)
  const [error, setError] = useState<string | null>(null)

  // Use the backend API hook
  const backend = useAutoTrainingBackend()

  // Initialize the auto training service (now connects to backend)
  const initialize = useCallback(async (customConfig?: Partial<AutoTrainingConfig>) => {
    try {
      const finalConfig = customConfig 
        ? { ...DEFAULT_AUTO_TRAINING_CONFIG, ...customConfig }
        : DEFAULT_AUTO_TRAINING_CONFIG

      setConfig(finalConfig)
      setIsInitialized(true)
      setError(null)
      console.log('Auto training service initialized')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize auto training')
    }
  }, [])

  // Start the automated training process
  const start = useCallback(async () => {
    if (!isInitialized) {
      setError('Service not initialized')
      return
    }

    try {
      const success = await backend.startAutoTraining(config)
      if (success) {
        setError(null)
        console.log('Auto training started')
      } else {
        setError('Failed to start auto training')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start auto training')
    }
  }, [isInitialized, config, backend])

  // Stop the automated training process
  const stop = useCallback(async () => {
    try {
      const success = await backend.stopAutoTraining()
      if (success) {
        console.log('Auto training stopped')
      } else {
        setError('Failed to stop auto training')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop auto training')
    }
  }, [backend])

  // Manually trigger a training cycle
  const triggerTraining = useCallback(async () => {
    try {
      const success = await backend.triggerTrainingCycle()
      if (success) {
        setError(null)
        console.log('Manual training cycle completed')
      } else {
        setError('Failed to trigger training')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger training')
    }
  }, [backend])

  // Update configuration
  const updateConfig = useCallback(async (newConfig: Partial<AutoTrainingConfig>) => {
    try {
      const success = await backend.updateAutoTrainingConfig(newConfig)
      if (success) {
        setConfig(prev => ({ ...prev, ...newConfig }))
        setError(null)
        console.log('Configuration updated')
      } else {
        setError('Failed to update configuration')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
    }
  }, [backend])

  // Export full training report
  const exportReport = useCallback(async () => {
    try {
      const report = await backend.exportTrainingReport()
      if (report) {
        console.log('Training report exported')
        return JSON.stringify(report, null, 2)
      } else {
        setError('Failed to export report')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
      return null
    }
  }, [backend])

  // Save model
  const saveModel = useCallback(async () => {
    try {
      const modelData = await backend.saveModel()
      if (modelData) {
        console.log('Model saved')
        return modelData
      } else {
        setError('Failed to save model')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model')
      return null
    }
  }, [backend])

  // Load model
  const loadModel = useCallback(async (modelData?: string) => {
    try {
      let dataToLoad = modelData

      if (!dataToLoad) {
        const saved = localStorage.getItem('osrs-auto-training-model')
        if (!saved) {
          setError('No saved model found')
          return false
        }
        dataToLoad = saved
      }

      const success = await backend.loadModel(dataToLoad)
      if (success) {
        console.log('Model loaded')
        setError(null)
        return true
      } else {
        setError('Failed to load model')
        return false
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
      return false
    }
  }, [backend])

  // Get historical data for specific item
  const getHistoricalData = useCallback(async (itemId?: number, timeRange?: number) => {
    try {
      const data = await backend.getHistoricalData(itemId, timeRange)
      return data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get historical data')
      return []
    }
  }, [backend])

  // Get item timeseries data
  const getItemTimeseries = useCallback(async (itemId: number) => {
    try {
      const data = await backend.getItemTimeseries(itemId)
      return data || []
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get item timeseries')
      return []
    }
  }, [backend])

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  // Auto-load saved model on initialization
  useEffect(() => {
    if (isInitialized && !backend.isRunning) {
      const savedModel = localStorage.getItem('osrs-auto-training-model')
      if (savedModel) {
        console.log('Auto-loading saved model...')
        loadModel(savedModel)
      }
    }
  }, [isInitialized, backend.isRunning, loadModel])

  return {
    // State
    isInitialized,
    isRunning: backend.isRunning,
    stats: backend.stats,
    error: error || backend.error,
    config: backend.config || config,

    // Actions
    initialize,
    start,
    stop,
    triggerTraining,
    updateConfig,
    exportReport,
    saveModel,
    loadModel,

    // Data access
    getHistoricalData,
    getItemTimeseries,

    // Utilities
    clearError: () => {
      setError(null)
      backend.clearError()
    },
    resetService: () => {
      setIsInitialized(false)
      setError(null)
      backend.clearError()
    }
  }
}