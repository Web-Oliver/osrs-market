import { useState, useCallback, useRef, useEffect } from 'react'
import type { 
  TrainingMetrics, 
  LearningSession, 
  NeuralNetworkConfig,
  AdaptiveLearningConfig,
  TradingAction
} from '../types/aiTrading'
import type { ItemPrice } from '../types'
import { AITradingOrchestrator } from '../services/aiTradingOrchestrator'

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
  const [isTraining, setIsTraining] = useState(false)
  const [currentSession, setCurrentSession] = useState<LearningSession | null>(null)
  const [trainingMetrics, setTrainingMetrics] = useState<TrainingMetrics[]>([])
  const [tradingActions, setTradingActions] = useState<TradingAction[]>([])
  const [performance, setPerformance] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)

  const orchestratorRef = useRef<AITradingOrchestrator | null>(null)

  // Initialize AI trading system
  const initializeAI = useCallback((
    networkConfig: Partial<NeuralNetworkConfig> = {},
    adaptiveConfig: Partial<AdaptiveLearningConfig> = {}
  ) => {
    try {
      const finalNetworkConfig = { ...DEFAULT_NETWORK_CONFIG, ...networkConfig }
      const finalAdaptiveConfig = { ...DEFAULT_ADAPTIVE_CONFIG, ...adaptiveConfig }

      orchestratorRef.current = new AITradingOrchestrator(
        finalNetworkConfig,
        finalAdaptiveConfig
      )

      setIsInitialized(true)
      setError(null)
      console.log('AI Trading system initialized successfully')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to initialize AI')
      console.error('Failed to initialize AI trading:', err)
    }
  }, [])

  // Start a new training session
  const startTraining = useCallback(() => {
    if (!orchestratorRef.current) {
      setError('AI system not initialized')
      return
    }

    try {
      const sessionId = orchestratorRef.current.startLearningSession()
      setIsTraining(true)
      setError(null)
      console.log(`Started training session: ${sessionId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training')
    }
  }, [])

  // Stop the current training session
  const stopTraining = useCallback(() => {
    if (!orchestratorRef.current) return

    try {
      orchestratorRef.current.finishLearningSession()
      setIsTraining(false)
      console.log('Training session stopped')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop training')
    }
  }, [])

  // Pause/resume training
  const pauseTraining = useCallback(() => {
    if (!orchestratorRef.current) return

    try {
      orchestratorRef.current.pauseLearningSession()
      console.log('Training paused')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause training')
    }
  }, [])

  const resumeTraining = useCallback(() => {
    if (!orchestratorRef.current) return

    try {
      orchestratorRef.current.resumeLearningSession()
      console.log('Training resumed')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume training')
    }
  }, [])

  // Process market data and get trading actions
  const processMarketData = useCallback(async (items: ItemPrice[]) => {
    if (!orchestratorRef.current) {
      setError('AI system not initialized')
      return []
    }

    try {
      const actions = await orchestratorRef.current.processMarketData(items)
      setTradingActions(actions)
      setError(null)
      return actions
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process market data')
      return []
    }
  }, [])

  // Get current training progress
  const getTrainingProgress = useCallback(() => {
    if (!orchestratorRef.current) return null

    try {
      return orchestratorRef.current.getTrainingProgress()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get training progress')
      return null
    }
  }, [])

  // Get performance analytics
  const getPerformanceAnalytics = useCallback(() => {
    if (!orchestratorRef.current) return null

    try {
      return orchestratorRef.current.getPerformanceAnalytics()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get performance analytics')
      return null
    }
  }, [])

  // Save the current model
  const saveModel = useCallback(() => {
    if (!orchestratorRef.current) {
      setError('AI system not initialized')
      return null
    }

    try {
      const modelData = orchestratorRef.current.saveModel()
      
      // Save to localStorage
      localStorage.setItem('osrs-ai-model', modelData)
      localStorage.setItem('osrs-ai-model-timestamp', Date.now().toString())
      
      console.log('Model saved successfully')
      return modelData
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save model')
      return null
    }
  }, [])

  // Load a previously saved model
  const loadModel = useCallback((modelData?: string) => {
    if (!orchestratorRef.current) {
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

      orchestratorRef.current.loadModel(dataToLoad)
      console.log('Model loaded successfully')
      setError(null)
      return true
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model')
      return false
    }
  }, [])

  // Export training data
  const exportTrainingData = useCallback(() => {
    if (!orchestratorRef.current) {
      setError('AI system not initialized')
      return null
    }

    try {
      const data = orchestratorRef.current.exportTrainingData()
      
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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to export training data')
      return null
    }
  }, [])

  // Update adaptive learning configuration
  const updateAdaptiveConfig = useCallback((config: Partial<AdaptiveLearningConfig>) => {
    if (!orchestratorRef.current) {
      setError('AI system not initialized')
      return
    }

    try {
      orchestratorRef.current.setAdaptiveConfig(config)
      console.log('Adaptive configuration updated')
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update adaptive config')
    }
  }, [])

  // Periodically update training progress when training
  useEffect(() => {
    if (!isTraining || !orchestratorRef.current) return

    const interval = setInterval(() => {
      const progress = getTrainingProgress()
      if (progress) {
        setCurrentSession(progress.session)
        setTrainingMetrics(progress.recentMetrics)
        setPerformance(progress.performance)
      }
    }, 5000) // Update every 5 seconds

    return () => clearInterval(interval)
  }, [isTraining, getTrainingProgress])

  // Auto-initialize on mount
  useEffect(() => {
    if (!isInitialized) {
      initializeAI()
    }
  }, [isInitialized, initializeAI])

  // Auto-load saved model on initialization
  useEffect(() => {
    if (isInitialized && !isTraining) {
      const savedModel = localStorage.getItem('osrs-ai-model')
      if (savedModel) {
        console.log('Auto-loading saved model...')
        loadModel(savedModel)
      }
    }
  }, [isInitialized, isTraining, loadModel])

  return {
    // State
    isInitialized,
    isTraining,
    currentSession,
    trainingMetrics,
    tradingActions,
    performance,
    error,

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
    clearError: () => setError(null),
    resetSystem: () => {
      setIsInitialized(false)
      setIsTraining(false)
      setCurrentSession(null)
      setTrainingMetrics([])
      setTradingActions([])
      setPerformance(null)
      setError(null)
      orchestratorRef.current = null
    }
  }
}