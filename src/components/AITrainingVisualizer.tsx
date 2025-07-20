import { useState, useEffect, useRef } from 'react'
import { Brain, Activity, Target, TrendingUp, Cpu, Database, Zap, Network, Layers, Monitor, BarChart3, GitBranch } from 'lucide-react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ScatterChart, Scatter } from 'recharts'

interface NeuralActivityData {
  layer: string
  neurons: number
  activation: number
  gradient: number
  timestamp: number
}

interface TrainingEpisodeData {
  episode: number
  timestamp: number
  reward: number
  loss: number
  epsilon: number
  actions: number
  profit: number
  accuracy: number
  qValue: number
  exploration: boolean
  item: string
  decision: 'BUY' | 'SELL' | 'HOLD'
  confidence: number
}

interface MarketStateData {
  item: string
  price: number
  volume: number
  volatility: number
  buyPrice: number
  sellPrice: number
  spread: number
  aiPrediction: number
  timestamp: number
}

export function AITrainingVisualizer() {
  const [isConnected, setIsConnected] = useState(false)
  const [trainingData, setTrainingData] = useState<TrainingEpisodeData[]>([])
  const [neuralActivity, setNeuralActivity] = useState<NeuralActivityData[]>([])
  const [marketState, setMarketState] = useState<MarketStateData[]>([])
  const [currentEpisode, setCurrentEpisode] = useState<TrainingEpisodeData | null>(null)
  const [systemStats, setSystemStats] = useState({
    totalEpisodes: 0,
    trainingTime: 0,
    modelSize: 0,
    memoryUsage: 0,
    gpuUsage: 0,
    learningRate: 0.001,
    batchSize: 32,
    bufferSize: 10000
  })

  const intervalRef = useRef<NodeJS.Timeout>()

  // Fetch real training data from backend APIs
  useEffect(() => {
    const fetchRealTrainingData = async () => {
      try {
        console.log('🔍 [AITrainingVisualizer] Starting data fetch...')
        
        // Fetch Python AI service status and training data
        const [pythonHealthResponse, trainingStatusResponse, aiTradingResponse] = await Promise.all([
          fetch('http://localhost:8000/api/v1/health/'),
          fetch('http://localhost:3001/api/auto-training/status'),
          fetch('http://localhost:3001/api/ai-trading/sessions')
        ])

        console.log('🔍 [AITrainingVisualizer] Response statuses:', {
          pythonHealth: pythonHealthResponse.status,
          trainingStatus: trainingStatusResponse.status,
          aiTrading: aiTradingResponse.status
        })

        // Get Python AI service health and neural network info
        if (pythonHealthResponse.ok) {
          const pythonHealth = await pythonHealthResponse.json()
          console.log('✅ [AITrainingVisualizer] Python AI response:', pythonHealth)
          setIsConnected(true)
          
          if (pythonHealth.components) {
            console.log('📊 [AITrainingVisualizer] Updating system stats from Python service')
            // Update system stats from real Python service
            setSystemStats(prev => ({
              ...prev,
              modelSize: pythonHealth.components.model?.size_mb || prev.modelSize,
              memoryUsage: pythonHealth.components.system?.memory_usage_percent || prev.memoryUsage,
              gpuUsage: pythonHealth.components.system?.gpu_usage_percent || 0
            }))

            // Extract neural network layer information
            if (pythonHealth.components.agent?.network_layers) {
              const networkLayers = pythonHealth.components.agent.network_layers
              const newNeuralActivity = networkLayers.map((layer: any) => ({
                layer: layer.name || 'Unknown',
                neurons: layer.neurons || 0,
                activation: layer.activation_level || 0,
                gradient: layer.gradient_norm || 0,
                timestamp: Date.now()
              }))
              setNeuralActivity(newNeuralActivity)
            }
          }
        }

        // Get training status and episode data
        if (trainingStatusResponse.ok) {
          const trainingStatus = await trainingStatusResponse.json()
          console.log('🔍 [AITrainingVisualizer] Training status response:', trainingStatus)
          
          if (trainingStatus.success && trainingStatus.data) {
            console.log('📊 [AITrainingVisualizer] Training data found:', trainingStatus.data)
            const data = trainingStatus.data
            
            // Update system stats from backend
            setSystemStats(prev => ({
              ...prev,
              totalEpisodes: data.status?.training?.session?.episodeCount || prev.totalEpisodes,
              trainingTime: data.status?.training?.session?.trainingTime || prev.trainingTime,
              learningRate: data.config?.training?.learningRate || prev.learningRate,
              batchSize: data.config?.training?.batchSize || prev.batchSize,
              bufferSize: data.config?.training?.bufferSize || prev.bufferSize
            }))

            // Extract training metrics if available
            if (data.status?.training?.metrics && Array.isArray(data.status.training.metrics)) {
              const metrics = data.status.training.metrics
              const formattedMetrics = metrics.map((metric: any, index: number) => ({
                episode: metric.episode || index + 1,
                timestamp: metric.timestamp || Date.now(),
                reward: metric.totalReward || metric.reward || 0,
                loss: metric.loss || 0,
                epsilon: metric.epsilon || 0,
                actions: metric.actions || 0,
                profit: metric.profitability || metric.profit || 0,
                accuracy: metric.successRate ? metric.successRate / 100 : 0,
                qValue: metric.qValue || 0,
                exploration: metric.epsilon > 0.1,
                item: metric.item || 'Unknown',
                decision: metric.lastAction || 'HOLD',
                confidence: metric.confidence || 0.5
              }))
              setTrainingData(formattedMetrics.slice(-50)) // Keep last 50 episodes
              
              // Set current episode to the latest
              if (formattedMetrics.length > 0) {
                setCurrentEpisode(formattedMetrics[formattedMetrics.length - 1])
              }
            }
          }
        }

        // Get AI trading sessions for market state
        if (aiTradingResponse.ok) {
          const aiTradingData = await aiTradingResponse.json()
          console.log('🔍 [AITrainingVisualizer] AI Trading response:', aiTradingData)
          
          if (aiTradingData.success && aiTradingData.data) {
            // Extract market state from AI trading sessions
            if (aiTradingData.data.currentItems && Array.isArray(aiTradingData.data.currentItems)) {
              const items = aiTradingData.data.currentItems
              const newMarketState = items.map((item: any) => ({
                item: item.name || 'Unknown',
                price: item.high || item.price || 0,
                volume: item.highTime || 0,
                volatility: item.volatility || 0,
                buyPrice: item.high || 0,
                sellPrice: item.low || 0,
                spread: (item.high || 0) - (item.low || 0),
                aiPrediction: item.aiPrediction || item.price || 0,
                timestamp: Date.now()
              }))
              setMarketState(newMarketState.slice(0, 10)) // Show top 10 items
            }
          }
        }

        // If no real training data found, try to get historical data
        if (trainingData.length === 0) {
          try {
            console.log('📈 [AITrainingVisualizer] Fetching historical training data...')
            const historicalResponse = await fetch('http://localhost:3001/api/auto-training/data/historical')
            console.log('📈 [AITrainingVisualizer] Historical response status:', historicalResponse.status)
            
            if (historicalResponse.ok) {
              const historicalData = await historicalResponse.json()
              console.log('📈 [AITrainingVisualizer] Historical data:', historicalData)
              
              if (historicalData.success && historicalData.data && Array.isArray(historicalData.data)) {
                console.log('📈 [AITrainingVisualizer] Historical data points:', historicalData.data.length)
                const formattedHistorical = historicalData.data.map((item: any, index: number) => ({
                  episode: index + 1,
                  timestamp: item.timestamp || Date.now(),
                  reward: item.reward || 0,
                  loss: item.loss || 0,
                  epsilon: item.epsilon || 0,
                  actions: item.actions || 0,
                  profit: item.profit || 0,
                  accuracy: item.accuracy || 0,
                  qValue: item.qValue || 0,
                  exploration: item.exploration || false,
                  item: item.item || 'Unknown',
                  decision: item.decision || 'HOLD',
                  confidence: item.confidence || 0.5
                }))
                setTrainingData(formattedHistorical.slice(-50))
                console.log('✅ [AITrainingVisualizer] Set historical training data:', formattedHistorical.length, 'points')
              } else {
                console.log('⚠️ [AITrainingVisualizer] Historical data not in expected format')
              }
            } else {
              console.log('❌ [AITrainingVisualizer] Historical response not ok:', historicalResponse.status)
            }
          } catch (error) {
            console.error('❌ [AITrainingVisualizer] Could not fetch historical training data:', error)
          }
        } else {
          console.log('📊 [AITrainingVisualizer] Already have training data:', trainingData.length, 'points')
        }

      } catch (error) {
        console.error('Error fetching real training data:', error)
        setIsConnected(false)
      }
    }

    // Initial fetch
    fetchRealTrainingData()
    
    // Refresh every 5 seconds for real-time updates
    intervalRef.current = setInterval(fetchRealTrainingData, 5000)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [])

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`
    return num.toFixed(0)
  }

  const formatGP = (num: number) => `${formatNumber(num)} GP`

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-indigo-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-2xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold mb-2 flex items-center">
                <Brain className="h-10 w-10 mr-4 animate-pulse" />
                AI Training Neural Network Visualizer
              </h1>
              <p className="text-xl opacity-90">Real-time deep reinforcement learning for OSRS market analysis</p>
            </div>
            <div className="text-right">
              <div className={`inline-flex items-center px-4 py-2 rounded-full text-lg font-semibold ${
                isConnected ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
              }`}>
                <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-white animate-pulse' : 'bg-gray-300'}`} />
                {isConnected ? 'TRAINING ACTIVE' : 'DISCONNECTED'}
              </div>
            </div>
          </div>
        </div>

        {/* Live System Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
          {[
            { label: 'Episodes', value: systemStats.totalEpisodes, icon: Target, color: 'from-blue-500 to-blue-600' },
            { label: 'Training Time', value: `${Math.floor(systemStats.trainingTime / 60)}m ${Math.floor(systemStats.trainingTime % 60)}s`, icon: Activity, color: 'from-green-500 to-green-600' },
            { label: 'Model Size', value: `${systemStats.modelSize.toFixed(1)}MB`, icon: Database, color: 'from-purple-500 to-purple-600' },
            { label: 'Memory', value: `${systemStats.memoryUsage.toFixed(0)}%`, icon: Cpu, color: 'from-orange-500 to-orange-600' },
            { label: 'GPU Usage', value: `${systemStats.gpuUsage.toFixed(0)}%`, icon: Zap, color: 'from-red-500 to-red-600' },
            { label: 'Learning Rate', value: systemStats.learningRate.toFixed(6), icon: TrendingUp, color: 'from-indigo-500 to-indigo-600' },
            { label: 'Batch Size', value: systemStats.batchSize, icon: Layers, color: 'from-pink-500 to-pink-600' },
            { label: 'Buffer Size', value: formatNumber(systemStats.bufferSize), icon: Network, color: 'from-teal-500 to-teal-600' }
          ].map((stat, index) => (
            <div key={index} className={`bg-gradient-to-br ${stat.color} rounded-xl shadow-lg p-4 text-white transform hover:scale-105 transition-transform`}>
              <div className="flex items-center justify-between">
                <div>
                  <stat.icon className="h-6 w-6 mb-2 opacity-80" />
                  <div className="text-2xl font-bold">{stat.value}</div>
                  <div className="text-sm opacity-80">{stat.label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Current Episode Spotlight */}
        {currentEpisode && (
          <div className="bg-gradient-to-r from-gray-800 to-gray-900 rounded-2xl shadow-2xl p-8 text-white border border-gray-700">
            <h2 className="text-3xl font-bold mb-6 flex items-center">
              <Monitor className="h-8 w-8 mr-3 text-green-400" />
              Live Training Episode #{currentEpisode.episode}
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-400">{currentEpisode.reward.toFixed(1)}</div>
                <div className="text-gray-400">Reward</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-400">{currentEpisode.loss.toFixed(3)}</div>
                <div className="text-gray-400">Loss</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-400">{(currentEpisode.epsilon * 100).toFixed(1)}%</div>
                <div className="text-gray-400">Exploration</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-400">{formatGP(currentEpisode.profit)}</div>
                <div className="text-gray-400">Profit</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-400">{(currentEpisode.accuracy * 100).toFixed(1)}%</div>
                <div className="text-gray-400">Accuracy</div>
              </div>
              <div className="text-center">
                <div className={`text-3xl font-bold ${
                  currentEpisode.decision === 'BUY' ? 'text-green-400' : 
                  currentEpisode.decision === 'SELL' ? 'text-red-400' : 'text-gray-400'
                }`}>
                  {currentEpisode.decision}
                </div>
                <div className="text-gray-400">{currentEpisode.item}</div>
              </div>
            </div>
          </div>
        )}

        {/* Neural Network Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <Network className="h-6 w-6 mr-2 text-blue-400" />
              Neural Network Activity
            </h3>
            <div className="space-y-4">
              {neuralActivity.map((layer, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold">{layer.layer}</span>
                    <span className="text-sm text-gray-400">{layer.neurons} neurons</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm">Activation:</span>
                      <span className="text-green-400">{(layer.activation * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-600 rounded-full h-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-blue-400 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${layer.activation * 100}%` }}
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm">Gradient:</span>
                      <span className={layer.gradient >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {layer.gradient >= 0 ? '+' : ''}{layer.gradient.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 text-white">
            <h3 className="text-2xl font-bold mb-4 flex items-center">
              <BarChart3 className="h-6 w-6 mr-2 text-purple-400" />
              Market State Analysis
            </h3>
            <div className="space-y-3">
              {marketState.map((item, index) => (
                <div key={index} className="bg-gray-700 rounded-lg p-4">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-lg">{item.item}</span>
                    <span className="text-xl font-bold text-yellow-400">{formatGP(item.price)}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-400">Buy: </span>
                      <span className="text-green-400">{formatGP(item.buyPrice)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Sell: </span>
                      <span className="text-red-400">{formatGP(item.sellPrice)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">Volume: </span>
                      <span className="text-blue-400">{formatNumber(item.volume)}</span>
                    </div>
                    <div>
                      <span className="text-gray-400">AI Pred: </span>
                      <span className="text-purple-400">{formatGP(item.aiPrediction)}</span>
                    </div>
                  </div>
                  <div className="mt-2">
                    <div className="flex justify-between text-xs text-gray-400">
                      <span>Spread: {(item.spread / item.price * 100).toFixed(2)}%</span>
                      <span>Volatility: {(item.volatility * 100).toFixed(1)}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Training Progress Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reward & Loss Chart */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              <TrendingUp className="h-6 w-6 mr-2 text-green-400" />
              Training Progress
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="episode" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="reward"
                    orientation="left"
                    stroke="#10B981"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="loss"
                    orientation="right"
                    stroke="#EF4444"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Line 
                    yAxisId="reward"
                    type="monotone" 
                    dataKey="reward" 
                    stroke="#10B981" 
                    strokeWidth={3}
                    dot={false}
                    name="Reward"
                  />
                  <Line 
                    yAxisId="loss"
                    type="monotone" 
                    dataKey="loss" 
                    stroke="#EF4444" 
                    strokeWidth={3}
                    dot={false}
                    name="Loss"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Profit & Accuracy Chart */}
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              <Target className="h-6 w-6 mr-2 text-blue-400" />
              Performance Metrics
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trainingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="episode" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="profit"
                    orientation="left"
                    stroke="#3B82F6"
                    fontSize={12}
                  />
                  <YAxis 
                    yAxisId="accuracy"
                    orientation="right"
                    stroke="#8B5CF6"
                    fontSize={12}
                    domain={[0, 1]}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Line 
                    yAxisId="profit"
                    type="monotone" 
                    dataKey="profit" 
                    stroke="#3B82F6" 
                    strokeWidth={3}
                    dot={false}
                    name="Profit"
                  />
                  <Line 
                    yAxisId="accuracy"
                    type="monotone" 
                    dataKey="accuracy" 
                    stroke="#8B5CF6" 
                    strokeWidth={3}
                    dot={false}
                    name="Accuracy"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Epsilon Decay & Q-Values */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              <GitBranch className="h-6 w-6 mr-2 text-yellow-400" />
              Exploration vs Exploitation
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trainingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="episode" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    domain={[0, 1]}
                    stroke="#F59E0B"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="epsilon" 
                    stroke="#F59E0B" 
                    fill="#F59E0B"
                    fillOpacity={0.3}
                    strokeWidth={3}
                    name="Epsilon (Exploration Rate)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-gray-800 rounded-2xl shadow-2xl p-6">
            <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
              <Cpu className="h-6 w-6 mr-2 text-red-400" />
              Q-Value Distribution
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart data={trainingData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis 
                    dataKey="episode" 
                    stroke="#9CA3AF"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="#EF4444"
                    fontSize={12}
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '8px',
                      color: 'white'
                    }}
                  />
                  <Scatter 
                    dataKey="qValue" 
                    fill="#EF4444"
                    name="Q-Value"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Real-time Decision Log */}
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6">
          <h3 className="text-2xl font-bold text-white mb-4 flex items-center">
            <Activity className="h-6 w-6 mr-2 text-green-400 animate-pulse" />
            Live Decision Stream
          </h3>
          <div className="max-h-80 overflow-y-auto space-y-2">
            {trainingData.slice(-15).reverse().map((episode, index) => (
              <div key={index} className="bg-gray-700 rounded-lg p-4 border-l-4 border-l-blue-400">
                <div className="flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    <span className="text-sm text-gray-400">#{episode.episode}</span>
                    <span className="font-semibold">{episode.item}</span>
                    <span className={`px-2 py-1 rounded text-sm font-bold ${
                      episode.decision === 'BUY' ? 'bg-green-600' : 
                      episode.decision === 'SELL' ? 'bg-red-600' : 'bg-gray-600'
                    }`}>
                      {episode.decision}
                    </span>
                    <span className="text-sm">
                      Confidence: <span className="text-blue-400">{(episode.confidence * 100).toFixed(1)}%</span>
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`text-lg font-bold ${episode.profit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {episode.profit >= 0 ? '+' : ''}{formatGP(episode.profit)}
                    </div>
                    <div className="text-sm text-gray-400">
                      Reward: {episode.reward.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}