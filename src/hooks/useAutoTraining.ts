import { useState, useCallback, useRef, useEffect } from 'react'
import { AutoTrainingService, type AutoTrainingConfig } from '../services/autoTrainingService'

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
    session: any
    metrics: any[]
    performance: any
    modelStats: any
  }
  analytics: any
}

export function useAutoTraining() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isRunning, setIsRunning] = useState(false)
  const [stats, setStats] = useState<AutoTrainingStats | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [config, setConfig] = useState<AutoTrainingConfig>(DEFAULT_AUTO_TRAINING_CONFIG)

  const serviceRef = useRef<AutoTrainingService | null>(null)

  // Initialize the auto training service
  const initialize = useCallback((customConfig?: Partial<AutoTrainingConfig>) => {
    try {
      const finalConfig = customConfig 
        ? { ...DEFAULT_AUTO_TRAINING_CONFIG, ...customConfig }
        : DEFAULT_AUTO_TRAINING_CONFIG

      serviceRef.current = new AutoTrainingService(finalConfig)
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
    if (!serviceRef.current) {
      setError('Service not initialized')
      return
    }

    try {
      await serviceRef.current.start()
      setIsRunning(true)
      setError(null)
      console.log('Auto training started')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start auto training')
    }
  }, [])

  // Stop the automated training process
  const stop = useCallback(() => {
    if (!serviceRef.current) return

    try {
      serviceRef.current.stop()
      setIsRunning(false)
      console.log('Auto training stopped')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop auto training')
    }
  }, [])

  // Manually trigger a training cycle
  const triggerTraining = useCallback(async () => {
    if (!serviceRef.current) {
      setError('Service not initialized')
      return
    }

    try {
      await serviceRef.current.manualTriggerTraining()
      setError(null)
      console.log('Manual training cycle completed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to trigger training')
    }
  }, [])

  // Update configuration
  const updateConfig = useCallback((newConfig: Partial<AutoTrainingConfig>) => {
    if (!serviceRef.current) {
      setError('Service not initialized')
      return
    }

    try {
      serviceRef.current.updateConfig(newConfig)
      setConfig(prev => ({ ...prev, ...newConfig }))
      setError(null)
      console.log('Configuration updated')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update configuration')
    }
  }, [])

  // Export full training report
  const exportReport = useCallback(async () => {
    if (!serviceRef.current) {
      setError('Service not initialized')
      return null
    }

    try {
      const report = await serviceRef.current.exportFullReport()
      
      // Create downloadable file
      const blob = new Blob([report], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `osrs-auto-training-report-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      console.log('Training report exported')
      return report
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export report')
      return null
    }
  }, [])

  // Save model
  const saveModel = useCallback(() => {
    if (!serviceRef.current) {
      setError('Service not initialized')
      return null
    }

    try {
      const modelData = serviceRef.current.saveModel()
      if (modelData) {
        localStorage.setItem('osrs-auto-training-model', modelData)
        localStorage.setItem('osrs-auto-training-model-timestamp', Date.now().toString())
        console.log('Model saved')
      }
      return modelData
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model')
      return null
    }
  }, [])

  // Load model
  const loadModel = useCallback((modelData?: string) => {
    if (!serviceRef.current) {
      setError('Service not initialized')
      return false
    }

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

      serviceRef.current.loadModel(dataToLoad)
      console.log('Model loaded')
      setError(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
      return false
    }
  }, [])

  // Get historical data for specific item
  const getHistoricalData = useCallback((itemId?: number, timeRange?: number) => {
    if (!serviceRef.current) return []
    
    try {
      return serviceRef.current.getHistoricalData(itemId, timeRange)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get historical data')
      return []
    }
  }, [])

  // Get item timeseries data
  const getItemTimeseries = useCallback((itemId: number) => {
    if (!serviceRef.current) return []
    
    try {
      return serviceRef.current.getItemTimeseries(itemId)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get item timeseries')
      return []
    }
  }, [])

  // Periodically update stats when running
  useEffect(() => {
    if (!isRunning || !serviceRef.current) return

    const interval = setInterval(() => {
      try {
        const currentStats = serviceRef.current?.getStatus()
        if (currentStats) {
          setStats(currentStats)
        }
      } catch (err) {
        console.error('Failed to update stats:', err)
      }
    }, 10000) // Update every 10 seconds

    return () => clearInterval(interval)
  }, [isRunning])

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initialize()
    }
  }, [isInitialized, initialize])

  // Auto-load saved model on initialization
  useEffect(() => {
    if (isInitialized && !isRunning) {
      const savedModel = localStorage.getItem('osrs-auto-training-model')
      if (savedModel) {
        console.log('Auto-loading saved model...')
        loadModel(savedModel)
      }
    }
  }, [isInitialized, isRunning, loadModel])

  return {
    // State
    isInitialized,
    isRunning,
    stats,
    error,
    config,

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
    clearError: () => setError(null),
    resetService: () => {
      if (serviceRef.current && isRunning) {
        serviceRef.current.stop()
      }
      setIsInitialized(false)
      setIsRunning(false)
      setStats(null)
      setError(null)
      serviceRef.current = null
    }
  }
}