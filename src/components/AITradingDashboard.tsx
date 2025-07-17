import { useState, useEffect } from 'react'
import { useAITrading } from '../hooks/useAITrading'
import { useItemPrices } from '../hooks/useItemPrices'
import type { AdaptiveLearningConfig } from '../types/aiTrading'

export function AITradingDashboard() {
  const {
    isInitialized,
    isTraining,
    currentSession,
    trainingMetrics,
    tradingActions,
    performance,
    error,
    startTraining,
    stopTraining,
    pauseTraining,
    resumeTraining,
    processMarketData,
    saveModel,
    loadModel,
    exportTrainingData,
    getPerformanceAnalytics,
    updateAdaptiveConfig,
    clearError
  } = useAITrading()

  const { items } = useItemPrices()
  const [autoTradeEnabled, setAutoTradeEnabled] = useState(false)
  const [adaptiveConfig, setAdaptiveConfig] = useState<Partial<AdaptiveLearningConfig>>({
    enableOnlineLearning: true,
    learningFrequency: 50,
    performanceThreshold: 60
  })

  // Auto-process market data when available
  useEffect(() => {
    if (items.length > 0 && isInitialized && isTraining) {
      processMarketData(items)
    }
  }, [items, isInitialized, isTraining, processMarketData])

  const handleStartTraining = () => {
    if (!isTraining) {
      startTraining()
    }
  }

  const handleStopTraining = () => {
    if (isTraining) {
      stopTraining()
    }
  }

  const handleConfigUpdate = () => {
    updateAdaptiveConfig(adaptiveConfig)
  }

  const handleSaveModel = () => {
    const modelData = saveModel()
    if (modelData) {
      alert('Model saved successfully!')
    }
  }

  const handleLoadModel = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (event) => {
          const modelData = event.target?.result as string
          if (loadModel(modelData)) {
            alert('Model loaded successfully!')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  const recentMetrics = trainingMetrics.slice(-10)
  const analytics = getPerformanceAnalytics()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">🤖 AI Trading Agent</h1>
            <p className="text-gray-600 mt-1">Neural network learning to trade OSRS items</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${isInitialized ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-gray-600">
              {isInitialized ? 'AI Initialized' : 'AI Not Ready'}
            </span>
          </div>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded flex justify-between items-center">
          <span>{error}</span>
          <button onClick={clearError} className="text-red-600 hover:text-red-800">×</button>
        </div>
      )}

      {/* Training Controls */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Training Controls</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <button
            onClick={handleStartTraining}
            disabled={!isInitialized || isTraining}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Start Training
          </button>
          
          <button
            onClick={handleStopTraining}
            disabled={!isTraining}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            Stop Training
          </button>
          
          <button
            onClick={currentSession?.status === 'PAUSED' ? resumeTraining : pauseTraining}
            disabled={!isTraining}
            className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {currentSession?.status === 'PAUSED' ? 'Resume' : 'Pause'}
          </button>
          
          <div className="flex items-center">
            <input
              type="checkbox"
              id="autoTrade"
              checked={autoTradeEnabled}
              onChange={(e) => setAutoTradeEnabled(e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="autoTrade" className="text-sm text-gray-700">Auto-trade</label>
          </div>
        </div>

        {/* Session Info */}
        {currentSession && (
          <div className="bg-blue-50 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Current Session</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-blue-600">Status:</span>
                <span className="ml-2 font-medium">{currentSession.status}</span>
              </div>
              <div>
                <span className="text-blue-600">Episodes:</span>
                <span className="ml-2 font-medium">{currentSession.episodeCount}</span>
              </div>
              <div>
                <span className="text-blue-600">Trades:</span>
                <span className="ml-2 font-medium">{currentSession.totalTrades}</span>
              </div>
              <div>
                <span className="text-blue-600">Profit:</span>
                <span className="ml-2 font-medium text-green-600">
                  {currentSession.totalProfit.toLocaleString()} GP
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Performance Metrics */}
      {performance && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Performance Metrics</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-green-600 text-sm font-medium">Success Rate</div>
              <div className="text-2xl font-bold text-green-900">
                {performance.successRate.toFixed(1)}%
              </div>
            </div>
            
            <div className="bg-blue-50 rounded-lg p-4">
              <div className="text-blue-600 text-sm font-medium">Total Profit</div>
              <div className="text-2xl font-bold text-blue-900">
                {performance.totalProfit.toLocaleString()} GP
              </div>
            </div>
            
            <div className="bg-purple-50 rounded-lg p-4">
              <div className="text-purple-600 text-sm font-medium">Avg Profit/Trade</div>
              <div className="text-2xl font-bold text-purple-900">
                {performance.averageProfit.toLocaleString()} GP
              </div>
            </div>
            
            <div className="bg-orange-50 rounded-lg p-4">
              <div className="text-orange-600 text-sm font-medium">Total Trades</div>
              <div className="text-2xl font-bold text-orange-900">
                {performance.totalTrades}
              </div>
            </div>
          </div>

          {analytics && (
            <div className="mt-6">
              <h3 className="font-medium text-gray-900 mb-3">Market Condition Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {analytics.byMarketCondition.map((condition: {
                  condition: string;
                  successRate: number;
                  totalProfit: number;
                }) => (
                  <div key={condition.condition} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm font-medium text-gray-700">{condition.condition}</div>
                    <div className="text-sm text-gray-600">
                      Success: {condition.successRate.toFixed(1)}% | 
                      Profit: {condition.totalProfit.toLocaleString()} GP
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recent Trading Actions */}
      {tradingActions.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Recent AI Decisions</h2>
          
          <div className="space-y-3">
            {tradingActions.slice(-5).map((action, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-4">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    action.type === 'BUY' ? 'bg-green-100 text-green-800' :
                    action.type === 'SELL' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {action.type}
                  </span>
                  <span className="font-medium">Item {action.itemId}</span>
                  <span className="text-gray-600">Qty: {action.quantity}</span>
                  <span className="text-gray-600">Price: {action.price.toLocaleString()} GP</span>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">
                    Confidence: {(action.confidence * 100).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">{action.reason}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Training Progress Chart */}
      {recentMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Training Progress</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Epsilon Decay</h3>
              <div className="h-32 bg-gray-50 rounded flex items-end justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {(recentMetrics[recentMetrics.length - 1]?.epsilon * 100 || 0).toFixed(1)}%
                  </div>
                  <div className="text-xs text-gray-500">Exploration Rate</div>
                </div>
              </div>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Portfolio Value</h3>
              <div className="h-32 bg-gray-50 rounded flex items-end justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {(recentMetrics[recentMetrics.length - 1]?.portfolioValue || 0).toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500">GP</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Adaptive Learning Configuration */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Adaptive Learning Settings</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Learning Frequency
            </label>
            <input
              type="number"
              value={adaptiveConfig.learningFrequency || 50}
              onChange={(e) => setAdaptiveConfig({
                ...adaptiveConfig,
                learningFrequency: parseInt(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="text-xs text-gray-500 mt-1">Trades between retraining</div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Performance Threshold
            </label>
            <input
              type="number"
              value={adaptiveConfig.performanceThreshold || 60}
              onChange={(e) => setAdaptiveConfig({
                ...adaptiveConfig,
                performanceThreshold: parseInt(e.target.value)
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <div className="text-xs text-gray-500 mt-1">Success rate % threshold</div>
          </div>
          
          <div className="flex items-end">
            <button
              onClick={handleConfigUpdate}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Update Config
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={adaptiveConfig.enableOnlineLearning}
              onChange={(e) => setAdaptiveConfig({
                ...adaptiveConfig,
                enableOnlineLearning: e.target.checked
              })}
              className="mr-2"
            />
            <span className="text-sm text-gray-700">Enable Online Learning</span>
          </label>
        </div>
      </div>

      {/* Model Management */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Model Management</h2>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleSaveModel}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Save Model
          </button>
          
          <button
            onClick={handleLoadModel}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Load Model
          </button>
          
          <button
            onClick={exportTrainingData}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
          >
            Export Training Data
          </button>
        </div>
      </div>
    </div>
  )
}