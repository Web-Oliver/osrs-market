import { useState, useCallback, useRef, useEffect } from 'react'
import type { 
  TrainingMetrics, 
  LearningSession, 
  NeuralNetworkConfig,
  AdaptiveLearningConfig,
  TradingAction
} from '../types/aiTrading'
import type { ItemPrice } from '../types'
import { useAITradingBackend } from './useAITradingBackend'

// Default neural network configuration
const DEFAULT_NETWORK_CONFIG: NeuralNetworkConfig = {
  inputSize: 8, // Market state features
  hiddenLayers: [128, 64, 32], // Three hidden layers
  outputSize: 3, // BUY, SELL, HOLD
  learningRate: 0.001,
  batchSize: 32,
  memorySize: 10000,
  epsilon: 1.0,
  epsilonDecay: 0.995,
  epsilonMin: 0.01,
  gamma: 0.99, // Discount factor
  tau: 0.001 // Target network update rate
}

// Default adaptive learning configuration
const DEFAULT_ADAPTIVE_CONFIG: AdaptiveLearningConfig = {
  enableOnlineLearning: true,
  learningFrequency: 50, // Retrain every 50 trades
  performanceThreshold: 60, // 60% success rate threshold
  adaptationRate: 0.1,
  memoryRetention: 0.8, // Keep 80% of old memories
  explorationBoost: true
}

export function useAITrading() {
  const [isInitialized, setIsInitialized] = useState(false)
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Use the backend API hook
  const backend = useAITradingBackend()

  // Initialize AI trading system (now connects to backend)
  const initializeAI = useCallback(async (
    networkConfig: Partial<NeuralNetworkConfig> = {},
    adaptiveConfig: Partial<AdaptiveLearningConfig> = {}
  ) => {
    try {
      const finalNetworkConfig = { ...DEFAULT_NETWORK_CONFIG, ...networkConfig }
      const finalAdaptiveConfig = { ...DEFAULT_ADAPTIVE_CONFIG, ...adaptiveConfig }

      const session = await backend.startTradingSession(
        'AI Trading Session',
        finalNetworkConfig,
        finalAdaptiveConfig
      )

      if (session) {
        setCurrentSessionId(session.sessionId)
        setIsInitialized(true)
        setError(null)
        console.log('AI Trading system initialized successfully')
      } else {
        setError('Failed to initialize AI trading session')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize AI')
      console.error('Failed to initialize AI trading:', err)
    }
  }, [backend])

  // Start a new training session (already handled by initializeAI)
  const startTraining = useCallback(async () => {
    if (!currentSessionId) {
      setError('AI system not initialized')
      return
    }

    try {
      const success = await backend.resumeTradingSession(currentSessionId)
      if (success) {
        setError(null)
        console.log(`Started training session: ${currentSessionId}`)
      } else {
        setError('Failed to start training')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training')
    }
  }, [currentSessionId, backend])

  // Stop the current training session
  const stopTraining = useCallback(async () => {
    if (!currentSessionId) return

    try {
      const success = await backend.stopTradingSession(currentSessionId)
      if (success) {
        setCurrentSessionId(null)
        setIsInitialized(false)
        console.log('Training session stopped')
      } else {
        setError('Failed to stop training')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop training')
    }
  }, [currentSessionId, backend])

  // Pause/resume training
  const pauseTraining = useCallback(async () => {
    if (!currentSessionId) return

    try {
      const success = await backend.pauseTradingSession(currentSessionId)
      if (success) {
        console.log('Training paused')
      } else {
        setError('Failed to pause training')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause training')
    }
  }, [currentSessionId, backend])

  const resumeTraining = useCallback(async () => {
    if (!currentSessionId) return

    try {
      const success = await backend.resumeTradingSession(currentSessionId)
      if (success) {
        console.log('Training resumed')
      } else {
        setError('Failed to resume training')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume training')
    }
  }, [currentSessionId, backend])

  // Process market data and get trading actions
  const processMarketData = useCallback(async (items: ItemPrice[]) => {
    if (!currentSessionId) {
      setError('AI system not initialized')
      return []
    }

    try {
      const actions = await backend.processMarketData(currentSessionId, items)
      setError(null)
      return actions
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process market data')
      return []
    }
  }, [currentSessionId, backend])

  // Get current training progress
  const getTrainingProgress = useCallback(async () => {
    if (!currentSessionId) return null

    try {
      await backend.getTrainingProgress(currentSessionId)
      return backend.trainingProgress
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get training progress')
      return null
    }
  }, [currentSessionId, backend])

  // Get performance analytics
  const getPerformanceAnalytics = useCallback(async () => {
    if (!currentSessionId) return null

    try {
      await backend.getPerformanceAnalytics(currentSessionId)
      return backend.analytics
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get performance analytics')
      return null
    }
  }, [currentSessionId, backend])

  // Save the current model
  const saveModel = useCallback(async () => {
    if (!currentSessionId) {
      setError('AI system not initialized')
      return null
    }

    try {
      const modelData = await backend.saveModel(currentSessionId)
      
      if (modelData) {
        // Save to localStorage
        localStorage.setItem('osrs-ai-model', modelData)
        localStorage.setItem('osrs-ai-model-timestamp', Date.now().toString())
        
        console.log('Model saved successfully')
        return modelData
      } else {
        setError('Failed to save model')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model')
      return null
    }
  }, [currentSessionId, backend])

  // Load a previously saved model
  const loadModel = useCallback(async (modelData?: string) => {
    if (!currentSessionId) {
      setError('AI system not initialized')
      return false
    }

    try {
      let dataToLoad = modelData

      // If no data provided, try loading from localStorage
      if (!dataToLoad) {
        const saved = localStorage.getItem('osrs-ai-model')
        if (!saved) {
          setError('No saved model found')
          return false
        }
        dataToLoad = saved
      }

      const success = await backend.loadModel(currentSessionId, dataToLoad)
      if (success) {
        console.log('Model loaded successfully')
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
  }, [currentSessionId, backend])

  // Export training data
  const exportTrainingData = useCallback(async () => {
    if (!currentSessionId) {
      setError('AI system not initialized')
      return null
    }

    try {
      const data = await backend.exportTrainingData(currentSessionId)
      
      if (data) {
        // Create downloadable file
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `osrs-ai-training-data-${Date.now()}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)

        console.log('Training data exported successfully')
        return data
      } else {
        setError('Failed to export training data')
        return null
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export training data')
      return null
    }
  }, [currentSessionId, backend])

  // Update adaptive learning configuration
  const updateAdaptiveConfig = useCallback(async (config: Partial<AdaptiveLearningConfig>) => {
    if (!currentSessionId) {
      setError('AI system not initialized')
      return
    }

    try {
      const success = await backend.updateAdaptiveConfig(currentSessionId, config)
      if (success) {
        console.log('Adaptive configuration updated')
        setError(null)
      } else {
        setError('Failed to update adaptive config')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update adaptive config')
    }
  }, [currentSessionId, backend])

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAI()
    }
  }, [isInitialized, initializeAI])

  // Auto-load saved model on initialization
  useEffect(() => {
    if (isInitialized && currentSessionId && !backend.isLoading) {
      const savedModel = localStorage.getItem('osrs-ai-model')
      if (savedModel) {
        console.log('Auto-loading saved model...')
        loadModel(savedModel)
      }
    }
  }, [isInitialized, currentSessionId, backend.isLoading, loadModel])

  return {
    // State
    isInitialized,
    isTraining: backend.currentSession?.status === 'TRAINING',
    currentSession: backend.currentSession,
    trainingMetrics: backend.trainingProgress?.recentMetrics || [],
    tradingActions: backend.actions,
    performance: backend.analytics,
    error: error || backend.error,

    // Actions
    initializeAI,
    startTraining,
    stopTraining,
    pauseTraining,
    resumeTraining,
    processMarketData,
    saveModel,
    loadModel,
    exportTrainingData,
    updateAdaptiveConfig,

    // Data
    getTrainingProgress,
    getPerformanceAnalytics,

    // Utilities
    clearError: () => {
      setError(null)
      backend.clearError()
    },
    resetSystem: () => {
      setIsInitialized(false)
      setCurrentSessionId(null)
      setError(null)
      backend.clearError()
    }
  }
}