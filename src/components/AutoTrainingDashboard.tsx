import { useState, useEffect } from 'react'
import { Play, Square, Download, Upload, Settings, Activity, TrendingUp, Database, Brain } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'
import { useAutoTraining } from '../hooks/useAutoTraining'
// Utility functions for formatting (extracted from mockChartData)
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
};

const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

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
  const [trainingMetrics, setTrainingMetrics] = useState<any[]>([])
  const [configForm, setConfigForm] = useState(config)

  // Fetch real training metrics from backend
  useEffect(() => {
    const fetchTrainingMetrics = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/auto-training/status');
        if (response.ok) {
          const statusData = await response.json();
          if (statusData.success && statusData.data?.status?.training?.metrics) {
            setTrainingMetrics(statusData.data.status.training.metrics);
          } else {
            // If no metrics available, set empty array
            setTrainingMetrics([]);
          }
        } else {
          console.error('Failed to fetch training status:', response.statusText);
        }
      } catch (error) {
        console.error('Error fetching training status:', error);
      }
    };

    // Initial fetch
    fetchTrainingMetrics();
    
    // Refresh metrics periodically
    const interval = setInterval(fetchTrainingMetrics, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, []); // Empty dependency array to prevent infinite loops

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

      {/* Training Progress Charts */}
      {trainingMetrics.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Training Progress</h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Reward & Success Rate Chart */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Reward & Success Rate</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trainingMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="episode" 
                      fontSize={12}
                      label={{ value: 'Episode', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      yAxisId="reward"
                      orientation="left"
                      fontSize={12}
                      label={{ value: 'Total Reward', angle: -90, position: 'insideLeft' }}
                    />
                    <YAxis 
                      yAxisId="success"
                      orientation="right"
                      fontSize={12}
                      label={{ value: 'Success Rate (%)', angle: 90, position: 'insideRight' }}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'totalReward' ? value.toFixed(2) : `${value.toFixed(1)}%`,
                        name === 'totalReward' ? 'Total Reward' : 'Success Rate'
                      ]}
                      labelFormatter={(label) => `Episode: ${label}`}
                    />
                    <Line 
                      yAxisId="reward"
                      type="monotone" 
                      dataKey="totalReward" 
                      stroke="#3b82f6" 
                      strokeWidth={2}
                      dot={false}
                      name="totalReward"
                    />
                    <Line 
                      yAxisId="success"
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={false}
                      name="successRate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Profitability Chart */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Profitability Over Time</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trainingMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="episode" 
                      fontSize={12}
                      label={{ value: 'Episode', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      fontSize={12}
                      label={{ value: 'Profit (GP)', angle: -90, position: 'insideLeft' }}
                      tickFormatter={(value) => formatCurrency(value)}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatCurrency(value), 'Profitability']}
                      labelFormatter={(label) => `Episode: ${label}`}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="profitability" 
                      stroke="#8b5cf6" 
                      fill="#8b5cf6"
                      fillOpacity={0.3}
                      strokeWidth={2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Epsilon Decay Chart */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Epsilon Decay (Exploration Rate)</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={trainingMetrics}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="episode" 
                      fontSize={12}
                      label={{ value: 'Episode', position: 'insideBottom', offset: -5 }}
                    />
                    <YAxis 
                      domain={[0, 1]}
                      fontSize={12}
                      label={{ value: 'Epsilon', angle: -90, position: 'insideLeft' }}
                      tickFormatter={formatPercentage}
                    />
                    <Tooltip 
                      formatter={(value: number) => [formatPercentage(value), 'Exploration Rate']}
                      labelFormatter={(label) => `Episode: ${label}`}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="epsilon" 
                      stroke="#f59e0b" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Recent Metrics Table (Summary) */}
            <div>
              <h4 className="font-medium text-gray-700 mb-3">Recent Episodes Summary</h4>
              <div className="h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2">Episode</th>
                      <th className="text-left py-2">Reward</th>
                      <th className="text-left py-2">Success %</th>
                      <th className="text-left py-2">Profit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trainingMetrics.slice(-10).map((metric, index) => (
                      <tr key={index} className="border-b border-gray-100">
                        <td className="py-2 font-medium">{metric.episode}</td>
                        <td className="py-2">{metric.totalReward.toFixed(2)}</td>
                        <td className="py-2">{metric.successRate.toFixed(1)}%</td>
                        <td className={`py-2 font-medium ${
                          metric.profitability >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {formatCurrency(metric.profitability)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}