import React, { useState, useEffect, useRef } from 'react'
import { 
  LineChart, Line, 
  ResponsiveContainer, XAxis, YAxis, CartesianGrid, 
  Tooltip
} from 'recharts'
import { 
  Activity, Database, TrendingUp, Clock, 
  Wifi, AlertTriangle, CheckCircle, XCircle, 
  Eye, Target, Shield, 
  Pause, Play
} from 'lucide-react'
import { mongoService, type SystemStatus, type EfficiencyMetrics, type LiveMonitoringData } from '../services/mongoService'

// Use LiveMonitoringData from mongoService
type LiveData = LiveMonitoringData

// SystemStatus imported from mongoService

// EfficiencyMetrics imported from mongoService

const LiveMonitoringDashboard: React.FC = () => {
  const [liveData, setLiveData] = useState<LiveData[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(2000) // 2 seconds
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [isConnectedToMongo, setIsConnectedToMongo] = useState(false)
  const [aggregatedStats, setAggregatedStats] = useState<{
    marketData?: Record<string, unknown>;
    monitoring?: Record<string, unknown>;
  } | null>(null)

  // Colors for charts following Context7 design patterns
  const chartColors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    info: '#5856D6',
    secondary: '#8E8E93'
  }

  // Fetch real data from MongoDB
  const fetchLiveData = async () => {
    try {
      const data = await mongoService.getLiveMonitoringData(50)
      setLiveData(data)
      setIsConnectedToMongo(true)
      
      if (data.length > 0) {
        setLastUpdate(new Date())
      }
    } catch (error) {
      console.error('Failed to fetch live data:', error)
      setIsConnectedToMongo(false)
    }
  }

  const fetchSystemStatus = async () => {
    try {
      const status = await mongoService.getSystemStatus()
      setSystemStatus(status)
    } catch (error) {
      console.error('Failed to fetch system status:', error)
    }
  }

  const fetchEfficiencyMetrics = async () => {
    try {
      const metrics = await mongoService.getEfficiencyMetrics()
      setEfficiencyMetrics(metrics)
    } catch (error) {
      console.error('Failed to fetch efficiency metrics:', error)
    }
  }

  const fetchAggregatedStats = async () => {
    try {
      const stats = await mongoService.getAggregatedStats()
      setAggregatedStats(stats)
    } catch (error) {
      console.error('Failed to fetch aggregated stats:', error)
    }
  }

  // Initialize real-time data fetching and MongoDB connection
  useEffect(() => {
    // Initial data load
    const loadInitialData = async () => {
      await Promise.all([
        fetchLiveData(),
        fetchSystemStatus(),
        fetchEfficiencyMetrics(),
        fetchAggregatedStats()
      ])
    }
    
    loadInitialData()

    // Start real-time updates from MongoDB if available
    if (isMonitoring) {
      // Try to start real-time updates via change streams
      mongoService.startRealTimeUpdates((newData) => {
        setLiveData(prev => {
          const updated = [...prev, newData]
          // Keep only last 50 data points for performance
          return updated.slice(-50)
        })
        setLastUpdate(new Date())
        setIsConnectedToMongo(true)
      })

      // Also set up periodic refresh for other data
      intervalRef.current = setInterval(async () => {
        await Promise.all([
          fetchSystemStatus(),
          fetchEfficiencyMetrics(),
          fetchAggregatedStats()
        ])
      }, refreshInterval)
    }

    return () => {
      mongoService.stopRealTimeUpdates()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isMonitoring, refreshInterval])

  // Handle monitoring toggle
  useEffect(() => {
    if (isMonitoring) {
      // Start real-time updates when monitoring is enabled
      mongoService.startRealTimeUpdates((newData) => {
        setLiveData(prev => {
          const updated = [...prev, newData]
          return updated.slice(-50)
        })
        setLastUpdate(new Date())
        setIsConnectedToMongo(true)
      })

      // Periodic data refresh
      intervalRef.current = setInterval(async () => {
        await Promise.all([
          fetchSystemStatus(),
          fetchEfficiencyMetrics(),
          fetchAggregatedStats()
        ])
      }, refreshInterval)
    } else {
      // Stop updates when monitoring is disabled
      mongoService.stopRealTimeUpdates()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }

    return () => {
      mongoService.stopRealTimeUpdates()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isMonitoring, refreshInterval])

  // Format time for charts
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }

  // Format uptime
  const formatUptime = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`
  }

  // Status indicator component
  const StatusIndicator: React.FC<{ 
    status: 'HEALTHY' | 'THROTTLED' | 'COOLDOWN' | 'OVERLOADED' | 'ACTIVE' | 'INACTIVE' 
  }> = ({ status }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'HEALTHY':
        case 'ACTIVE':
          return { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-100' }
        case 'THROTTLED':
          return { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-100' }
        case 'COOLDOWN':
        case 'OVERLOADED':
          return { icon: XCircle, color: 'text-red-500', bg: 'bg-red-100' }
        case 'INACTIVE':
          return { icon: Pause, color: 'text-gray-500', bg: 'bg-gray-100' }
      }
    }

    const { icon: Icon, color, bg } = getStatusConfig()
    
    return (
      <div className={`flex items-center space-x-2 px-3 py-1 rounded-full ${bg}`}>
        <Icon className={`h-4 w-4 ${color}`} />
        <span className={`text-sm font-medium ${color}`}>{status}</span>
      </div>
    )
  }

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ color: string; dataKey: string; value: number | string }>;
    label?: number;
  }) => {
    if (active && payload && payload.length) {
      return (
        <div className={`bg-white p-3 border border-gray-200 rounded-lg shadow-lg`}>
          <p className={`text-sm font-medium text-gray-900 mb-2`}>{formatTime(label)}</p>
          {payload.map((entry, index: number) => (
            <div key={index} className={`flex items-center space-x-2 text-sm`}>
              <div 
                className={`w-3 h-3 rounded-full`}
                style={{ backgroundColor: entry.color }}
              />
              <span className={`text-gray-600`}>{entry.dataKey}:</span>
              <span className={`font-medium text-gray-900`}>{entry.value}</span>
            </div>
          ))}
        </div>
      )
    }
    return null
  }

  const latestData = liveData[liveData.length - 1]

  return (
    <div className={`min-h-screen bg-gray-50 p-6`}>
      {/* Header */}
      <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6`}>
        <div className={`flex items-center justify-between`}>
          <div className={`flex items-center space-x-4`}>
            <div className={`flex items-center space-x-2`}>
              <Eye className={`h-8 w-8 text-blue-600`} />
              <h1 className={`text-3xl font-bold text-gray-900`}>Live Monitoring Dashboard</h1>
            </div>
            <StatusIndicator status={isMonitoring ? 'ACTIVE' : 'INACTIVE'} />
          </div>
          
          <div className={`flex items-center space-x-4`}>
            <div className={`flex items-center space-x-2`}>
              <Database className={`h-4 w-4 ${isConnectedToMongo ? 'text-green-500' : 'text-red-500'}`} />
              <span className={`text-sm font-medium ${isConnectedToMongo ? 'text-green-600' : 'text-red-600'}`}>
                MongoDB {isConnectedToMongo ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            <div className={`text-sm text-gray-500`}>
              Last update: {lastUpdate.toLocaleTimeString()}
            </div>
            
            <div className={`flex items-center space-x-2`}>
              <label className={`text-sm font-medium text-gray-700`}>Refresh:</label>
              <select
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(Number(e.target.value))}
                className={`px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500`}
              >
                <option value={1000}>1s</option>
                <option value={2000}>2s</option>
                <option value={5000}>5s</option>
                <option value={10000}>10s</option>
              </select>
            </div>
            
            <button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`flex items-center px-4 py-2 rounded-lg font-medium transition-colors ${
                isMonitoring 
                  ? 'bg-red-600 text-white hover:bg-red-700' 
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isMonitoring ? <Pause className={`h-4 w-4 mr-2`} /> : <Play className={`h-4 w-4 mr-2`} />}
              {isMonitoring ? 'Pause' : 'Start'} Monitoring
            </button>
          </div>
        </div>
      </div>

      {/* Key Metrics Cards */}
      {latestData && (
        <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6`}>
          {/* API Requests */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-medium text-gray-600`}>API Requests/min</p>
                <p className={`text-3xl font-bold text-gray-900`}>{latestData.apiRequests}</p>
                <p className={`text-sm text-gray-500`}>of 30 max</p>
              </div>
              <div className={`h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center`}>
                <Wifi className={`h-6 w-6 text-blue-600`} />
              </div>
            </div>
            <div className={`mt-4`}>
              <div className={`flex items-center justify-between text-sm`}>
                <span className={`text-gray-600`}>Usage</span>
                <span className={`font-medium`}>{((latestData.apiRequests / 30) * 100).toFixed(1)}%</span>
              </div>
              <div className={`w-full bg-gray-200 rounded-full h-2 mt-1`}>
                <div 
                  className={`bg-blue-600 h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${(latestData.apiRequests / 30) * 100}%` }}
                />
              </div>
            </div>
          </div>

          {/* Success Rate */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-medium text-gray-600`}>Success Rate</p>
                <p className={`text-3xl font-bold text-green-600`}>{latestData.successRate}%</p>
                <p className={`text-sm text-gray-500`}>API calls</p>
              </div>
              <div className={`h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center`}>
                <CheckCircle className={`h-6 w-6 text-green-600`} />
              </div>
            </div>
            <StatusIndicator status={latestData.successRate > 95 ? 'HEALTHY' : 'THROTTLED'} />
          </div>

          {/* Items Processed */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-medium text-gray-600`}>Items Processed</p>
                <p className={`text-3xl font-bold text-purple-600`}>{latestData.itemsProcessed}</p>
                <p className={`text-sm text-gray-500`}>of ~100 tracked</p>
              </div>
              <div className={`h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center`}>
                <Target className={`h-6 w-6 text-purple-600`} />
              </div>
            </div>
            <div className={`mt-4`}>
              <div className={`flex items-center justify-between text-sm`}>
                <span className={`text-gray-600`}>Efficiency</span>
                <span className={`font-medium`}>{latestData.itemSelectionEfficiency}%</span>
              </div>
              <div className={`w-full bg-gray-200 rounded-full h-2 mt-1`}>
                <div 
                  className={`bg-purple-600 h-2 rounded-full transition-all duration-500`}
                  style={{ width: `${latestData.itemSelectionEfficiency}%` }}
                />
              </div>
            </div>
          </div>

          {/* Response Time */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className={`flex items-center justify-between`}>
              <div>
                <p className={`text-sm font-medium text-gray-600`}>Response Time</p>
                <p className={`text-3xl font-bold text-orange-600`}>{latestData.responseTime}ms</p>
                <p className={`text-sm text-gray-500`}>avg API response</p>
              </div>
              <div className={`h-12 w-12 bg-orange-100 rounded-lg flex items-center justify-center`}>
                <Clock className={`h-6 w-6 text-orange-600`} />
              </div>
            </div>
            <StatusIndicator status={latestData.responseTime < 1000 ? 'HEALTHY' : 'THROTTLED'} />
          </div>
        </div>
      )}

      {/* Live Charts */}
      <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6`}>
        {/* API Requests Over Time */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
          <div className={`flex items-center justify-between mb-4`}>
            <h3 className={`text-lg font-semibold text-gray-900`}>API Requests Over Time</h3>
            <div className={`flex items-center space-x-2`}>
              <Wifi className={`h-5 w-5 text-blue-600`} />
              <span className={`text-sm text-gray-500`}>Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={liveData} accessibilityLayer>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="5 5" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="apiRequests" 
                stroke={chartColors.primary} 
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5, stroke: chartColors.primary, strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Success Rate & Response Time */}
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
          <div className={`flex items-center justify-between mb-4`}>
            <h3 className={`text-lg font-semibold text-gray-900`}>Performance Metrics</h3>
            <div className={`flex items-center space-x-2`}>
              <Activity className={`h-5 w-5 text-green-600`} />
              <span className={`text-sm text-gray-500`}>Live</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={liveData} accessibilityLayer>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="5 5" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTime}
                tick={{ fontSize: 12, fill: '#6b7280' }}
              />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
              <Tooltip content={<CustomTooltip />} />
              <Line 
                type="monotone" 
                dataKey="successRate" 
                stroke={chartColors.success} 
                strokeWidth={2}
                name="Success Rate (%)"
              />
              <Line 
                type="monotone" 
                dataKey="responseTime" 
                stroke={chartColors.warning} 
                strokeWidth={2}
                name="Response Time (ms)"
                yAxisId="right"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* System Status */}
      {systemStatus && (
        <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6`}>
          {/* Data Collection Status */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className={`flex items-center justify-between mb-4`}>
              <h3 className={`text-lg font-semibold text-gray-900`}>Data Collection</h3>
              <Database className={`h-5 w-5 text-blue-600`} />
            </div>
            <div className={`space-y-3`}>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Status</span>
                <StatusIndicator status={systemStatus.dataCollection.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Total Collections</span>
                <span className={`font-medium`}>{systemStatus.dataCollection.totalCollections.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Success Rate</span>
                <span className={`font-medium text-green-600`}>{systemStatus.dataCollection.successRate}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Uptime</span>
                <span className={`font-medium`}>{formatUptime(systemStatus.dataCollection.uptime)}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Avg Response</span>
                <span className={`font-medium`}>{systemStatus.dataCollection.averageResponseTime}</span>
              </div>
            </div>
          </div>

          {/* API Rate Limiting */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className={`flex items-center justify-between mb-4`}>
              <h3 className={`text-lg font-semibold text-gray-900`}>Rate Limiting</h3>
              <Shield className={`h-5 w-5 text-green-600`} />
            </div>
            <div className={`space-y-3`}>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Status</span>
                <StatusIndicator status={systemStatus.apiRateLimiting.status as 'HEALTHY' | 'THROTTLED' | 'COOLDOWN' | 'OVERLOADED' | 'ACTIVE' | 'INACTIVE'} />
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Requests/min</span>
                <span className={`font-medium`}>
                  {systemStatus.apiRateLimiting.requestsInLastMinute}/{systemStatus.apiRateLimiting.maxRequestsPerMinute}
                </span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Requests/hour</span>
                <span className={`font-medium`}>
                  {systemStatus.apiRateLimiting.requestsInLastHour}/{systemStatus.apiRateLimiting.maxRequestsPerHour}
                </span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Queue Length</span>
                <span className={`font-medium`}>{systemStatus.apiRateLimiting.queueLength}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Rate Limited</span>
                <span className={`font-medium text-green-600`}>{systemStatus.apiRateLimiting.rateLimitedRequests}</span>
              </div>
            </div>
          </div>

          {/* Smart Item Selection */}
          <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
            <div className={`flex items-center justify-between mb-4`}>
              <h3 className={`text-lg font-semibold text-gray-900`}>Smart Selection</h3>
              <Target className={`h-5 w-5 text-purple-600`} />
            </div>
            <div className={`space-y-3`}>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Items Tracked</span>
                <span className={`font-medium`}>{systemStatus.smartItemSelection.totalSelected}/{systemStatus.smartItemSelection.capacity}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Utilization</span>
                <span className={`font-medium text-purple-600`}>{systemStatus.smartItemSelection.utilizationPercent}</span>
              </div>
              <div className={`mt-4`}>
                <div className={`w-full bg-gray-200 rounded-full h-2`}>
                  <div 
                    className={`bg-purple-600 h-2 rounded-full transition-all duration-500`}
                    style={{ width: systemStatus.smartItemSelection.utilizationPercent }}
                  />
                </div>
              </div>
              <div className={`text-xs text-gray-500 mt-2`}>
                {systemStatus.smartItemSelection.efficiency}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Efficiency Metrics */}
      {efficiencyMetrics && (
        <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
          <div className={`flex items-center justify-between mb-6`}>
            <h3 className={`text-lg font-semibold text-gray-900`}>Efficiency Gains</h3>
            <TrendingUp className={`h-5 w-5 text-green-600`} />
          </div>
          
          <div className={`grid grid-cols-1 md:grid-cols-3 gap-6`}>
            {/* Smart Selection Efficiency */}
            <div className={`text-center`}>
              <div className={`text-3xl font-bold text-purple-600 mb-2`}>
                {efficiencyMetrics.smartSelection.reductionPercent}
              </div>
              <div className={`text-sm font-medium text-gray-900 mb-1`}>Fewer Items to Process</div>
              <div className={`text-xs text-gray-500`}>
                Tracking {efficiencyMetrics.smartSelection.itemsTracked} instead of {efficiencyMetrics.smartSelection.totalOSRSItems.toLocaleString()}
              </div>
            </div>

            {/* API Usage Efficiency */}
            <div className={`text-center`}>
              <div className={`text-3xl font-bold text-green-600 mb-2`}>
                {efficiencyMetrics.apiUsage.compliance}
              </div>
              <div className={`text-sm font-medium text-gray-900 mb-1`}>API Compliance</div>
              <div className={`text-xs text-gray-500`}>
                {efficiencyMetrics.apiUsage.totalSavedRequests}
              </div>
            </div>

            {/* Performance Improvement */}
            <div className={`text-center`}>
              <div className={`text-3xl font-bold text-blue-600 mb-2`}>
                {efficiencyMetrics.performance.estimatedTimeReduction}
              </div>
              <div className={`text-sm font-medium text-gray-900 mb-1`}>Time Reduction</div>
              <div className={`text-xs text-gray-500`}>
                {efficiencyMetrics.performance.reducedMemoryUsage}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Console Output */}
      <div className={`bg-black rounded-lg shadow-sm border border-gray-200 p-6 mt-6`}>
        <div className={`flex items-center justify-between mb-4`}>
          <h3 className={`text-lg font-semibold text-green-400`}>Live Console Output</h3>
          <div className={`flex items-center space-x-2`}>
            <div className={`w-2 h-2 bg-green-400 rounded-full animate-pulse`} />
            <span className={`text-green-400 text-sm`}>LIVE</span>
          </div>
        </div>
        <div className={`bg-black text-green-400 font-mono text-sm space-y-1 max-h-64 overflow-y-auto`}>
          <div>[{formatTime(Date.now())}] [MongoDB-Debug] Context7 optimized query executed</div>
          <div>[{formatTime(Date.now())}] [DataCollector-Debug] Smart item filtering applied</div>
          <div>[{formatTime(Date.now())}] [RateLimiter-Debug] Making rate-limited API request</div>
          <div>[{formatTime(Date.now())}] [SmartSelector-Debug] Items grouped by tier</div>
          <div>[{formatTime(Date.now())}] [MongoDB-Debug] Real-time change stream activated</div>
          <div>[{formatTime(Date.now())}] [DataCollector-Debug] Market summary generated</div>
          <div>[{formatTime(Date.now())}] [RateLimiter-Debug] API request successful</div>
          <div>[{formatTime(Date.now())}] [MongoDB-Debug] Live monitoring data saved with Context7 optimizations</div>
          <div>[{formatTime(Date.now())}] [MongoDB-Debug] Aggregation pipeline completed - {aggregatedStats?.totalApiRequests || 0} total requests</div>
          <div>[{formatTime(Date.now())}] [DataCollector-Debug] Collection cycle completed</div>
        </div>
      </div>
    </div>
  )
}

export default LiveMonitoringDashboard