import { useState } from 'react'
import { Play, Square, Download, Upload, Settings, Activity, TrendingUp, Database, Brain } from 'lucide-react'
import { useAutoTraining } from '../hooks/useAutoTraining'

export function AutoTrainingDashboard() {
  const {
    isInitialized,
    isRunning,
    stats,
    error,
    config,
    start,
    stop,
    triggerTraining,
    updateConfig,
    exportReport,
    saveModel,
    loadModel,
    clearError
  } = useAutoTraining()

  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false)
  const [configForm, setConfigForm] = useState(config)

  const handleStart = async () => {
    clearError()
    await start()
  }

  const handleStop = () => {
    clearError()
    stop()
  }

  const handleTriggerTraining = async () => {
    clearError()
    await triggerTraining()
  }

  const handleUpdateConfig = () => {
    updateConfig(configForm)
    setShowAdvancedConfig(false)
  }

  const handleExportReport = async () => {
    clearError()
    await exportReport()
  }

  const handleSaveModel = () => {
    clearError()
    saveModel()
  }

  const handleLoadModel = () => {
    clearError()
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const content = e.target?.result as string
          loadModel(content)
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  if (!isInitialized) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-32">
          <div className="text-center">
            <Brain className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600">Initializing Auto Training System...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center">
              <Brain className="h-6 w-6 mr-2 text-blue-600" />
              Automated AI Training System
            </h2>
            <p className="text-gray-600 mt-1">
              Continuous learning from OSRS market data with real-time optimization
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              isRunning 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {isRunning ? 'ACTIVE' : 'STOPPED'}
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
            <p className="text-red-700 text-sm">{error}</p>
            <button
              onClick={clearError}
              className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Control Panel */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Control Panel</h3>
        <div className="flex flex-wrap gap-3">
          {!isRunning ? (
            <button
              onClick={handleStart}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Play className="h-4 w-4 mr-2" />
              Start Training
            </button>
          ) : (
            <button
              onClick={handleStop}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <Square className="h-4 w-4 mr-2" />
              Stop Training
            </button>
          )}

          <button
            onClick={handleTriggerTraining}
            disabled={!isRunning}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Activity className="h-4 w-4 mr-2" />
            Manual Cycle
          </button>

          <button
            onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
            className="flex items-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Settings className="h-4 w-4 mr-2" />
            Configuration
          </button>

          <button
            onClick={handleExportReport}
            className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </button>

          <button
            onClick={handleSaveModel}
            className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Save Model
          </button>

          <button
            onClick={handleLoadModel}
            className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            <Upload className="h-4 w-4 mr-2" />
            Load Model
          </button>
        </div>
      </div>

      {/* System Status */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Data Collection Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Data Collection</h3>
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Status:</span>
                <span className={`font-medium ${
                  stats.dataCollection.status === 'ACTIVE' 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {stats.dataCollection.status}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Collections:</span>
                <span className="font-medium">{stats.dataCollection.totalCollections}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Memory:</span>
                <span className="font-medium">{stats.dataCollection.memoryUsage}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Last Update:</span>
                <span className="font-medium text-sm">
                  {stats.dataCollection.lastCollection 
                    ? new Date(stats.dataCollection.lastCollection).toLocaleTimeString()
                    : 'Never'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Training Status */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Training Session</h3>
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <div className="space-y-2">
              {stats.training.session ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Episodes:</span>
                    <span className="font-medium">{typeof stats.training.session.episodeCount === 'number' ? stats.training.session.episodeCount : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Trades:</span>
                    <span className="font-medium">{typeof stats.training.session.totalTrades === 'number' ? stats.training.session.totalTrades : 'N/A'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit:</span>
                    <span className={`font-medium ${
                      typeof stats.training.session.totalProfit === 'number' && stats.training.session.totalProfit >= 0 
                        ? 'text-green-600' 
                        : 'text-red-600'
                    }`}>
                      {typeof stats.training.session.totalProfit === 'number' ? stats.training.session.totalProfit.toFixed(0) : 'N/A'} GP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Epsilon:</span>
                    <span className="font-medium">
                      {typeof stats.training.session.finalEpsilon === 'number' ? stats.training.session.finalEpsilon.toFixed(3) : 'N/A'}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center">No active session</p>
              )}
            </div>
          </div>

          {/* Performance Metrics */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Performance</h3>
              <TrendingUp className="h-5 w-5 text-green-600" />
            </div>
            <div className="space-y-2">
              {stats.training.performance ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span className="font-medium text-blue-600">
                      {typeof stats.training.performance.successRate === 'number' ? stats.training.performance.successRate.toFixed(1) : 'N/A'}%
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Profit:</span>
                    <span className="font-medium">
                      {typeof stats.training.performance.averageProfit === 'number' ? stats.training.performance.averageProfit.toFixed(0) : 'N/A'} GP
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Profit Factor:</span>
                    <span className="font-medium">
                      {typeof stats.training.performance.profitFactor === 'number' ? stats.training.performance.profitFactor.toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Max Drawdown:</span>
                    <span className="font-medium text-red-600">
                      {typeof stats.training.performance.maxDrawdown === 'number' ? stats.training.performance.maxDrawdown.toFixed(0) : 'N/A'} GP
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-gray-500 text-center">No performance data</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Advanced Configuration */}
      {showAdvancedConfig && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Configuration</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Training Configuration */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Training Settings</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Training Interval (ms)
                  </label>
                  <input
                    type="number"
                    value={configForm.training.trainingInterval}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      training: {
                        ...prev.training,
                        trainingInterval: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Min Data Points
                  </label>
                  <input
                    type="number"
                    value={configForm.training.minDataPoints}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      training: {
                        ...prev.training,
                        minDataPoints: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Batch Processing Size
                  </label>
                  <input
                    type="number"
                    value={configForm.training.batchProcessingSize}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      training: {
                        ...prev.training,
                        batchProcessingSize: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Item Selection Configuration */}
            <div>
              <h4 className="font-medium text-gray-900 mb-3">Item Selection</h4>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Range Min (GP)
                  </label>
                  <input
                    type="number"
                    value={configForm.itemSelection.priceRangeMin}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      itemSelection: {
                        ...prev.itemSelection,
                        priceRangeMin: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price Range Max (GP)
                  </label>
                  <input
                    type="number"
                    value={configForm.itemSelection.priceRangeMax}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      itemSelection: {
                        ...prev.itemSelection,
                        priceRangeMax: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Spread Threshold (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={configForm.itemSelection.spreadThreshold}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      itemSelection: {
                        ...prev.itemSelection,
                        spreadThreshold: parseFloat(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Max Items to Trade
                  </label>
                  <input
                    type="number"
                    value={configForm.itemSelection.maxItemsToTrade}
                    onChange={(e) => setConfigForm(prev => ({
                      ...prev,
                      itemSelection: {
                        ...prev.itemSelection,
                        maxItemsToTrade: parseInt(e.target.value)
                      }
                    }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => setShowAdvancedConfig(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleUpdateConfig}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Apply Changes
            </button>
          </div>
        </div>
      )}

      {/* Recent Training Metrics */}
      {stats?.training.metrics && stats.training.metrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Training Metrics</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Episode</th>
                  <th className="text-left py-2">Reward</th>
                  <th className="text-left py-2">Success Rate</th>
                  <th className="text-left py-2">Profit</th>
                  <th className="text-left py-2">Epsilon</th>
                </tr>
              </thead>
              <tbody>
                {stats.training.metrics.slice(-5).map((metric, index: number) => (
                  <tr key={index} className="border-b border-gray-100">
                    <td className="py-2">{typeof metric.episode === 'number' ? metric.episode : 'N/A'}</td>
                    <td className="py-2">{typeof metric.totalReward === 'number' ? metric.totalReward.toFixed(2) : 'N/A'}</td>
                    <td className="py-2">{typeof metric.successRate === 'number' ? metric.successRate.toFixed(1) : 'N/A'}%</td>
                    <td className={`py-2 ${
                      (typeof metric.profitability === 'number' ? metric.profitability : 0) >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {typeof metric.profitability === 'number' ? metric.profitability.toFixed(0) : 'N/A'} GP
                    </td>
                    <td className="py-2">{typeof metric.epsilon === 'number' ? metric.epsilon.toFixed(3) : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}