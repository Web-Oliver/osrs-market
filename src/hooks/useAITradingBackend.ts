import { useState, useEffect, useCallback } from 'react'
import { AITradingApi, type AITradingSession, type TrainingProgress, type PerformanceAnalytics, type TradingSignal, type SystemStatus } from '../services/aiTradingApi'
import type { ItemPrice, AdaptiveLearningConfig, NeuralNetworkConfig, TradingAction } from '../types'

export interface AITradingState {
  isLoading: boolean
  error: string | null
  sessions: AITradingSession[]
  currentSession: AITradingSession | null
  systemStatus: SystemStatus | null
  trainingProgress: TrainingProgress | null
  analytics: PerformanceAnalytics | null
  signals: TradingSignal[]
  actions: TradingAction[]
}

export const useAITradingBackend = () => {
  const [state, setState] = useState<AITradingState>({
    isLoading: false,
    error: null,
    sessions: [],
    currentSession: null,
    systemStatus: null,
    trainingProgress: null,
    analytics: null,
    signals: [],
    actions: []
  })

  /**
   * Start a new AI trading session
   */
  const startTradingSession = useCallback(async (
    sessionName?: string,
    networkConfig?: NeuralNetworkConfig,
    adaptiveConfig?: AdaptiveLearningConfig
  ): Promise<AITradingSession | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.startTradingSession(sessionName, networkConfig, adaptiveConfig)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to start trading session')
      }

      const newSession = response.data
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        currentSession: newSession,
        sessions: [...prev.sessions, newSession]
      }))

      return newSession
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
   * Stop an AI trading session
   */
  const stopTradingSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.stopTradingSession(sessionId)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to stop trading session')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        sessions: prev.sessions.filter(s => s.sessionId !== sessionId),
        currentSession: prev.currentSession?.sessionId === sessionId ? null : prev.currentSession
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
   * Pause an AI trading session
   */
  const pauseTradingSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.pauseTradingSession(sessionId)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to pause trading session')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        sessions: prev.sessions.map(s => 
          s.sessionId === sessionId ? { ...s, status: 'PAUSED' } : s
        ),
        currentSession: prev.currentSession?.sessionId === sessionId 
          ? { ...prev.currentSession, status: 'PAUSED' }
          : prev.currentSession
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
   * Resume an AI trading session
   */
  const resumeTradingSession = useCallback(async (sessionId: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.resumeTradingSession(sessionId)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to resume trading session')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        sessions: prev.sessions.map(s => 
          s.sessionId === sessionId ? { ...s, status: 'TRAINING' } : s
        ),
        currentSession: prev.currentSession?.sessionId === sessionId 
          ? { ...prev.currentSession, status: 'TRAINING' }
          : prev.currentSession
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
   * Process market data for trading decisions with auto-session refresh
   */
  const processMarketData = useCallback(async (
    sessionId: string,
    items: ItemPrice[]
  ): Promise<TradingAction[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.processMarketData(sessionId, items)
      
      if (!response.success) {
        // Check if it's a session not found error (404)
        if (response.error?.includes('404') || response.error?.includes('not found') || response.error?.includes('session')) {
          console.log('🔄 Session expired, creating new session...')
          
          // Create a new session automatically
          const newSession = await startTradingSession('Auto-refreshed Session')
          if (newSession) {
            console.log('✅ New session created:', newSession.sessionId)
            
            // Retry with new session
            const retryResponse = await AITradingApi.processMarketData(newSession.sessionId, items)
            if (retryResponse.success) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                actions: retryResponse.data.actions
              }))
              return retryResponse.data.actions
            }
          }
        }
        
        throw new Error(response.error || 'Failed to process market data')
      }

      const actions = response.data.actions
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        actions
      }))

      return actions
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return []
    }
  }, [startTradingSession])

  /**
   * Get training progress for a session with auto-session refresh
   */
  const getTrainingProgress = useCallback(async (sessionId: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.getTrainingProgress(sessionId)
      
      if (!response.success) {
        // Check if it's a session not found error (404)
        if (response.error?.includes('404') || response.error?.includes('not found') || response.error?.includes('session')) {
          console.log('🔄 Session expired, creating new session for progress check...')
          
          // Create a new session automatically
          const newSession = await startTradingSession('Auto-refreshed Session for Progress')
          if (newSession) {
            console.log('✅ New session created for progress:', newSession.sessionId)
            
            // Retry with new session
            const retryResponse = await AITradingApi.getTrainingProgress(newSession.sessionId)
            if (retryResponse.success) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                trainingProgress: retryResponse.data
              }))
              return
            }
          }
        }
        
        throw new Error(response.error || 'Failed to get training progress')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        trainingProgress: response.data
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [startTradingSession])

  /**
   * Get performance analytics for a session with auto-session refresh
   */
  const getPerformanceAnalytics = useCallback(async (sessionId: string): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.getPerformanceAnalytics(sessionId)
      
      if (!response.success) {
        // Check if it's a session not found error (404)
        if (response.error?.includes('404') || response.error?.includes('not found') || response.error?.includes('session')) {
          console.log('🔄 Session expired, creating new session for analytics...')
          
          // Create a new session automatically
          const newSession = await startTradingSession('Auto-refreshed Session for Analytics')
          if (newSession) {
            console.log('✅ New session created for analytics:', newSession.sessionId)
            
            // Retry with new session
            const retryResponse = await AITradingApi.getPerformanceAnalytics(newSession.sessionId)
            if (retryResponse.success) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                analytics: retryResponse.data
              }))
              return
            }
          }
        }
        
        throw new Error(response.error || 'Failed to get performance analytics')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        analytics: response.data
      }))
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
    }
  }, [startTradingSession])

  /**
   * Update adaptive configuration with auto-session refresh
   */
  const updateAdaptiveConfig = useCallback(async (
    sessionId: string,
    config: Partial<AdaptiveLearningConfig>
  ): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.updateAdaptiveConfig(sessionId, config)
      
      if (!response.success) {
        // Check if it's a session not found error (404)
        if (response.error?.includes('404') || response.error?.includes('not found') || response.error?.includes('session')) {
          console.log('🔄 Session expired, creating new session for config update...')
          
          // Create a new session automatically
          const newSession = await startTradingSession('Auto-refreshed Session for Config')
          if (newSession) {
            console.log('✅ New session created for config:', newSession.sessionId)
            
            // Retry with new session
            const retryResponse = await AITradingApi.updateAdaptiveConfig(newSession.sessionId, config)
            if (retryResponse.success) {
              setState(prev => ({
                ...prev,
                isLoading: false,
                sessions: prev.sessions.map(s => 
                  s.sessionId === newSession.sessionId ? { ...s, adaptiveConfig: retryResponse.data.adaptiveConfig } : s
                ),
                currentSession: prev.currentSession?.sessionId === newSession.sessionId 
                  ? { ...prev.currentSession, adaptiveConfig: retryResponse.data.adaptiveConfig }
                  : prev.currentSession
              }))
              return true
            }
          }
        }
        
        throw new Error(response.error || 'Failed to update adaptive configuration')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        sessions: prev.sessions.map(s => 
          s.sessionId === sessionId ? { ...s, adaptiveConfig: response.data.adaptiveConfig } : s
        ),
        currentSession: prev.currentSession?.sessionId === sessionId 
          ? { ...prev.currentSession, adaptiveConfig: response.data.adaptiveConfig }
          : prev.currentSession
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
  }, [startTradingSession])

  /**
   * Save AI model with auto-session refresh
   */
  const saveModel = useCallback(async (sessionId: string): Promise<string | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.saveModel(sessionId)
      
      if (!response.success) {
        // Check if it's a session not found error (404)
        if (response.error?.includes('404') || response.error?.includes('not found') || response.error?.includes('session')) {
          console.log('🔄 Session expired, creating new session for model save...')
          
          // Create a new session automatically
          const newSession = await startTradingSession('Auto-refreshed Session for Save')
          if (newSession) {
            console.log('✅ New session created for save:', newSession.sessionId)
            
            // Retry with new session
            const retryResponse = await AITradingApi.saveModel(newSession.sessionId)
            if (retryResponse.success) {
              setState(prev => ({ ...prev, isLoading: false }))
              return retryResponse.data.modelData
            }
          }
        }
        
        throw new Error(response.error || 'Failed to save model')
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return response.data.modelData
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [startTradingSession])

  /**
   * Load AI model with auto-session refresh
   */
  const loadModel = useCallback(async (sessionId: string, modelData: string): Promise<boolean> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.loadModel(sessionId, modelData)
      
      if (!response.success) {
        // Check if it's a session not found error (404)
        if (response.error?.includes('404') || response.error?.includes('not found') || response.error?.includes('session')) {
          console.log('🔄 Session expired, creating new session for model load...')
          
          // Create a new session automatically
          const newSession = await startTradingSession('Auto-refreshed Session for Load')
          if (newSession) {
            console.log('✅ New session created for load:', newSession.sessionId)
            
            // Retry with new session
            const retryResponse = await AITradingApi.loadModel(newSession.sessionId, modelData)
            if (retryResponse.success) {
              setState(prev => ({ ...prev, isLoading: false }))
              return true
            }
          }
        }
        
        throw new Error(response.error || 'Failed to load model')
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
  }, [startTradingSession])

  /**
   * Export training data with auto-session refresh
   */
  const exportTrainingData = useCallback(async (sessionId: string): Promise<Record<string, unknown> | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.exportTrainingData(sessionId)
      
      if (!response.success) {
        // Check if it's a session not found error (404)
        if (response.error?.includes('404') || response.error?.includes('not found') || response.error?.includes('session')) {
          console.log('🔄 Session expired, creating new session for data export...')
          
          // Create a new session automatically
          const newSession = await startTradingSession('Auto-refreshed Session for Export')
          if (newSession) {
            console.log('✅ New session created for export:', newSession.sessionId)
            
            // Retry with new session
            const retryResponse = await AITradingApi.exportTrainingData(newSession.sessionId)
            if (retryResponse.success) {
              setState(prev => ({ ...prev, isLoading: false }))
              return retryResponse.data.exportData
            }
          }
        }
        
        throw new Error(response.error || 'Failed to export training data')
      }

      setState(prev => ({ ...prev, isLoading: false }))
      return response.data.exportData
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return null
    }
  }, [startTradingSession])

  /**
   * Generate trading signals
   */
  const generateTradingSignals = useCallback(async (items: ItemPrice[]): Promise<TradingSignal[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.generateTradingSignals(items)
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to generate trading signals')
      }

      const signals = response.data.signals
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        signals
      }))

      return signals
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      }))
      return []
    }
  }, [])

  /**
   * Get active trading sessions
   */
  const getActiveSessions = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.getActiveSessions()
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get active sessions')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        sessions: response.data.sessions
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
   * Get system status
   */
  const getSystemStatus = useCallback(async (): Promise<void> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }))
    
    try {
      const response = await AITradingApi.getSystemStatus()
      
      if (!response.success) {
        throw new Error(response.error || 'Failed to get system status')
      }

      setState(prev => ({
        ...prev,
        isLoading: false,
        systemStatus: response.data
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
   * Set current session
   */
  const setCurrentSession = useCallback((sessionId: string | null) => {
    setState(prev => ({
      ...prev,
      currentSession: sessionId 
        ? prev.sessions.find(s => s.sessionId === sessionId) || null
        : null
    }))
  }, [])

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }))
  }, [])

  /**
   * Auto-refresh training progress for current session
   */
  useEffect(() => {
    if (!state.currentSession || state.currentSession.status !== 'TRAINING') return

    const interval = setInterval(async () => {
      try {
        await getTrainingProgress(state.currentSession!.sessionId)
      } catch {
        // Silently fail for auto-refresh
      }
    }, 5000) // Refresh every 5 seconds

    return () => clearInterval(interval)
  }, [state.currentSession, getTrainingProgress])

  return {
    ...state,
    startTradingSession,
    stopTradingSession,
    pauseTradingSession,
    resumeTradingSession,
    processMarketData,
    getTrainingProgress,
    getPerformanceAnalytics,
    updateAdaptiveConfig,
    saveModel,
    loadModel,
    exportTrainingData,
    generateTradingSignals,
    getActiveSessions,
    getSystemStatus,
    setCurrentSession,
    clearError
  }
}