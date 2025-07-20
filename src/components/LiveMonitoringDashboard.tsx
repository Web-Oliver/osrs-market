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
  Pause, Play, Search, Filter, Download,
  Bell, RefreshCw, Globe, Server
} from 'lucide-react'
import useWebSocket, { ReadyState } from 'react-use-websocket'
import { mongoService, type SystemStatus, type EfficiencyMetrics, type LiveMonitoringData } from '../services/mongoService'
import { formatTime } from '../utils/formatters'

// Use LiveMonitoringData from mongoService
type LiveData = LiveMonitoringData

// SystemStatus imported from mongoService

// EfficiencyMetrics imported from mongoService

// New types for enhanced monitoring
type SystemAction = {
  id: string
  timestamp: number
  type: 'API_CALL' | 'DATA_COLLECTION' | 'RATE_LIMIT' | 'DATABASE' | 'ERROR' | 'SUCCESS' | 'WARNING'
  category: 'SYSTEM' | 'USER' | 'EXTERNAL' | 'INTERNAL'
  action: string
  details: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  duration?: number
  metadata?: Record<string, unknown>
}

// WebSocket log entry types
type LogEntry = {
  timestamp: number
  level: 'info' | 'warn' | 'error' | 'debug'
  service: string
  message: string
  itemId?: number
  traceId?: string
}

type _WebSocketLogMessage = {
  type: 'log'
  data: LogEntry
}

type ActivityFilter = {
  type: string[]
  category: string[]
  severity: string[]
  timeRange: '5m' | '15m' | '1h' | '6h' | '24h'
  searchTerm: string
}

const LiveMonitoringDashboard: React.FC = () => {
  const [liveData, setLiveData] = useState<LiveData[]>([])
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null)
  const [efficiencyMetrics, setEfficiencyMetrics] = useState<EfficiencyMetrics | null>(null)
  const [isMonitoring, setIsMonitoring] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(10000) // 10 seconds to reduce resource usage
  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [requestInProgress, setRequestInProgress] = useState(false)
  const requestCacheRef = useRef<{ [key: string]: { data: any, timestamp: number } }>({})
  const [isConnectedToMongo, setIsConnectedToMongo] = useState(false)
  const [_aggregatedStats, setAggregatedStats] = useState<{
    marketData?: Record<string, unknown>;
    monitoring?: Record<string, unknown>;
  } | null>(null)
  
  // Enhanced monitoring state
  const [systemActions, setSystemActions] = useState<SystemAction[]>([])
  const [activityFilter, setActivityFilter] = useState<ActivityFilter>({
    type: [],
    category: [],
    severity: [],
    timeRange: '1h',
    searchTerm: ''
  })
  const [showActivityFeed, setShowActivityFeed] = useState(true)
  const [notifications, setNotifications] = useState<SystemAction[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)
  
  // WebSocket state for live console output
  const [socketUrl] = useState(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const host = window.location.hostname
    const port = ':3002' // Backend WebSocket server is on port 3002
    return `${protocol}//${host}${port}/logs`
  })
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [isWebSocketConnected, setIsWebSocketConnected] = useState(false)
  const [webSocketError, setWebSocketError] = useState<string | null>(null)

  // WebSocket connection with useWebSocket hook - Context7 optimized
  const { readyState, lastMessage: _lastMessage } = useWebSocket(socketUrl, {
    onOpen: () => {
      setIsWebSocketConnected(true)
      setWebSocketError(null)
      console.log('✅ WebSocket connected to', socketUrl)
    },
    onClose: (event) => {
      setIsWebSocketConnected(false)
      console.log('🔌 WebSocket disconnected:', event.code, event.reason)
    },
    onError: (event) => {
      setIsWebSocketConnected(false)
      setWebSocketError('WebSocket connection failed - backend may be offline')
      console.warn('❌ WebSocket connection failed:', event)
    },
    onMessage: (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'log') {
          setLogEntries(prev => [data.data, ...prev.slice(0, 499)]); // Keep last 500 logs
        }
      } catch (error) {
        console.warn('Failed to parse WebSocket message:', error);
      }
    },
    // Context7 Pattern: Exponential backoff reconnection
    shouldReconnect: (closeEvent) => {
      // Don't reconnect if it was a normal closure or server shutdown
      return closeEvent.code !== 1000 && closeEvent.code !== 1001;
    },
    reconnectAttempts: 10,
    reconnectInterval: (attemptNumber) =>
      Math.min(Math.pow(2, attemptNumber) * 1000, 10000), // 1s, 2s, 4s, 8s, then 10s cap
    // Context7 Pattern: Heartbeat for connection health
    heartbeat: {
      message: 'ping',
      returnMessage: 'pong',
      timeout: 60000, // 1 minute
      interval: 25000, // every 25 seconds
    },
  })

  // Connection status based on WebSocket ready state
  const connectionStatus = readyState === ReadyState.OPEN ? 'Connected' : 
                          readyState === ReadyState.CONNECTING ? 'Connecting' : 
                          readyState === ReadyState.CLOSING ? 'Closing' : 
                          'Disconnected'

  // Colors for charts following Context7 design patterns
  const chartColors = {
    primary: '#007AFF',
    success: '#34C759',
    warning: '#FF9500',
    danger: '#FF3B30',
    info: '#5856D6',
    secondary: '#8E8E93'
  }

  // System actions should come from real backend events only

  // Add new system action and manage notifications
  const _addSystemAction = (action: SystemAction) => {
    setSystemActions(prev => {
      const safeArray = Array.isArray(prev) ? prev : []
      const updated = [action, ...safeArray].slice(0, 1000) // Keep last 1000 actions
      return updated
    })

    // Add to notifications for high severity actions
    if (action.severity === 'HIGH' || action.severity === 'CRITICAL') {
      setNotifications(prev => {
        const safeArray = Array.isArray(prev) ? prev : []
        return [action, ...safeArray].slice(0, 10)
      })
    }
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
    const cacheKey = 'systemStatus'
    const now = Date.now()
    const cached = requestCacheRef.current[cacheKey]
    
    console.log(`🔍 [fetchSystemStatus] Starting at ${new Date().toLocaleTimeString()}`)
    
    // Use cache if data is less than 30 seconds old
    if (cached && (now - cached.timestamp) < 30000) {
      console.log(`⚡ [fetchSystemStatus] Using cached data (${Math.round((now - cached.timestamp)/1000)}s old)`)
      setSystemStatus(cached.data)
      return
    }
    
    try {
      console.log(`🌐 [fetchSystemStatus] Making API requests to both /api/system-status and /api/auto-training/status`)
      const startTime = Date.now()
      
      // Get both system status and auto training status
      const [systemStatus, autoTrainingResponse] = await Promise.all([
        mongoService.getSystemStatus(),
        fetch('http://localhost:3001/api/auto-training/status').then(r => r.json())
      ])
      
      // Merge the data, prioritizing auto training service data for data collection
      const mergedStatus = {
        ...systemStatus,
        dataCollection: autoTrainingResponse.success && autoTrainingResponse.data?.status?.dataCollection ? {
          isActive: autoTrainingResponse.data.status.dataCollection.status === 'ACTIVE',
          totalCollections: autoTrainingResponse.data.status.dataCollection.totalCollections || 0,
          successfulCalls: systemStatus.dataCollection?.successfulCalls || 0,
          failedCalls: systemStatus.dataCollection?.failedCalls || 0,
          successRate: systemStatus.dataCollection?.successRate || '0%',
          uptime: systemStatus.dataCollection?.uptime || 0,
          averageResponseTime: systemStatus.dataCollection?.averageResponseTime || '0ms',
          lastCollection: autoTrainingResponse.data.status.dataCollection.lastCollection,
          memoryUsage: autoTrainingResponse.data.status.dataCollection.memoryUsage || 0
        } : systemStatus.dataCollection || {
          isActive: false,
          totalCollections: 0,
          successfulCalls: 0,
          failedCalls: 0,
          successRate: '0%',
          uptime: 0,
          averageResponseTime: '0ms'
        }
      }
      
      const duration = Date.now() - startTime
      console.log(`✅ [fetchSystemStatus] API requests completed in ${duration}ms`)
      setSystemStatus(mergedStatus)
      requestCacheRef.current[cacheKey] = { data: mergedStatus, timestamp: now }
    } catch (error) {
      console.error(`❌ [fetchSystemStatus] API request failed:`, error)
    }
  }

  const fetchEfficiencyMetrics = async () => {
    const cacheKey = 'efficiencyMetrics'
    const now = Date.now()
    const cached = requestCacheRef.current[cacheKey]
    
    console.log(`🔍 [fetchEfficiencyMetrics] Starting at ${new Date().toLocaleTimeString()}`)
    
    // Use cache if data is less than 30 seconds old
    if (cached && (now - cached.timestamp) < 30000) {
      console.log(`⚡ [fetchEfficiencyMetrics] Using cached data (${Math.round((now - cached.timestamp)/1000)}s old)`)
      setEfficiencyMetrics(cached.data)
      return
    }
    
    try {
      console.log(`🌐 [fetchEfficiencyMetrics] Making API request to /api/efficiency-metrics`)
      const startTime = Date.now()
      const metrics = await mongoService.getEfficiencyMetrics()
      const duration = Date.now() - startTime
      console.log(`✅ [fetchEfficiencyMetrics] API request completed in ${duration}ms`)
      setEfficiencyMetrics(metrics)
      requestCacheRef.current[cacheKey] = { data: metrics, timestamp: now }
    } catch (error) {
      console.error(`❌ [fetchEfficiencyMetrics] API request failed:`, error)
    }
  }

  const fetchAggregatedStats = async () => {
    const cacheKey = 'aggregatedStats'
    const now = Date.now()
    const cached = requestCacheRef.current[cacheKey]
    
    console.log(`🔍 [fetchAggregatedStats] Starting at ${new Date().toLocaleTimeString()}`)
    
    // Use cache if data is less than 30 seconds old
    if (cached && (now - cached.timestamp) < 30000) {
      console.log(`⚡ [fetchAggregatedStats] Using cached data (${Math.round((now - cached.timestamp)/1000)}s old)`)
      setAggregatedStats(cached.data)
      return
    }
    
    try {
      console.log(`🌐 [fetchAggregatedStats] Making API request to /api/aggregated-stats`)
      const startTime = Date.now()
      const stats = await mongoService.getAggregatedStats()
      const duration = Date.now() - startTime
      console.log(`✅ [fetchAggregatedStats] API request completed in ${duration}ms`)
      setAggregatedStats(stats)
      requestCacheRef.current[cacheKey] = { data: stats, timestamp: now }
    } catch (error) {
      console.error(`❌ [fetchAggregatedStats] API request failed:`, error)
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

    // Note: Real-time updates are now handled in the monitoring toggle useEffect to avoid duplicates

    if (isMonitoring) {
      // Set up periodic refresh for other data
      intervalRef.current = setInterval(async () => {
        console.log(`🔄 [POLLING] Starting polling cycle at ${new Date().toLocaleTimeString()}`)
        
        // Prevent multiple requests from running simultaneously
        if (requestInProgress) {
          console.log('⏸️ [POLLING] Previous request still in progress, skipping this cycle')
          return
        }
        
        setRequestInProgress(true)
        console.log(`🚀 [POLLING] Starting sequential API requests`)
        
        try {
          // Run requests sequentially to avoid overwhelming browser resources
          console.log(`📊 [POLLING] Step 1/3: Fetching system status`)
          await fetchSystemStatus()
          
          console.log(`⏳ [POLLING] Waiting 1s before next request`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay
          
          console.log(`📈 [POLLING] Step 2/3: Fetching efficiency metrics`)
          await fetchEfficiencyMetrics()
          
          console.log(`⏳ [POLLING] Waiting 1s before next request`)
          await new Promise(resolve => setTimeout(resolve, 1000)) // 1s delay
          
          console.log(`📋 [POLLING] Step 3/3: Fetching aggregated stats`)
          await fetchAggregatedStats()
          
          console.log(`✅ [POLLING] All requests completed successfully`)
        } catch (error) {
          console.error('❌ [POLLING] Error in periodic refresh:', error)
        } finally {
          setRequestInProgress(false)
          console.log(`🏁 [POLLING] Polling cycle finished, next cycle in ${refreshInterval/1000}s`)
        }
        
        // System actions should come from real backend events only
      }, refreshInterval)
    }

    return () => {
      mongoService.stopRealTimeUpdates()
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, [isMonitoring, refreshInterval])

  // Filter system actions based on current filter settings
  const filteredActions = systemActions.filter(action => {
    // Time range filter
    const timeRangeMs = {
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000
    }[activityFilter.timeRange]
    
    if (Date.now() - action.timestamp > timeRangeMs) {
      return false
    }

    // Type filter
    if (activityFilter.type.length > 0 && !activityFilter.type.includes(action.type)) {
      return false
    }

    // Category filter
    if (activityFilter.category.length > 0 && !activityFilter.category.includes(action.category)) {
      return false
    }

    // Severity filter
    if (activityFilter.severity.length > 0 && !activityFilter.severity.includes(action.severity)) {
      return false
    }

    // Search term filter
    if (activityFilter.searchTerm && !action.action.toLowerCase().includes(activityFilter.searchTerm.toLowerCase()) && 
        !action.details.toLowerCase().includes(activityFilter.searchTerm.toLowerCase())) {
      return false
    }

    return true
  })

  // Handle monitoring toggle
  useEffect(() => {
    if (isMonitoring) {
      // Start real-time updates when monitoring is enabled
      mongoService.startRealTimeUpdates((newData) => {
        setLiveData(prev => {
          const safeArray = Array.isArray(prev) ? prev : []
          const updated = [...safeArray, newData]
          return updated.slice(-50)
        })
        setLastUpdate(new Date())
        setIsConnectedToMongo(true)
      })
    } else {
      // Stop updates when monitoring is disabled
      mongoService.stopRealTimeUpdates()
    }

    return () => {
      mongoService.stopRealTimeUpdates()
    }
  }, [isMonitoring])

  // Format time for charts (remove this as we're importing from utils)
  const formatTimeForChart = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    })
  }
  
  // Real log entry handling only - no mock data
  
  // Only use real log data from WebSocket - no mock data generation

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
          <p className={`text-sm font-medium text-gray-900 mb-2`}>{formatTimeForChart(label || 0)}</p>
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

  // Activity feed components
  const ActivityFeedItem: React.FC<{ action: SystemAction }> = ({ action }) => {
    const getActionIcon = () => {
      switch (action.type) {
        case 'API_CALL': return <Globe className="h-4 w-4" />
        case 'DATA_COLLECTION': return <Database className="h-4 w-4" />
        case 'RATE_LIMIT': return <Shield className="h-4 w-4" />
        case 'DATABASE': return <Server className="h-4 w-4" />
        case 'SUCCESS': return <CheckCircle className="h-4 w-4" />
        case 'WARNING': return <AlertTriangle className="h-4 w-4" />
        case 'ERROR': return <XCircle className="h-4 w-4" />
        default: return <Activity className="h-4 w-4" />
      }
    }

    const getActionColor = () => {
      switch (action.severity) {
        case 'CRITICAL': return 'text-red-600 bg-red-100'
        case 'HIGH': return 'text-orange-600 bg-orange-100'
        case 'MEDIUM': return 'text-yellow-600 bg-yellow-100'
        case 'LOW': return 'text-green-600 bg-green-100'
        default: return 'text-gray-600 bg-gray-100'
      }
    }

    const getCategoryColor = () => {
      switch (action.category) {
        case 'SYSTEM': return 'text-blue-600 bg-blue-100'
        case 'EXTERNAL': return 'text-purple-600 bg-purple-100'
        case 'INTERNAL': return 'text-indigo-600 bg-indigo-100'
        case 'USER': return 'text-pink-600 bg-pink-100'
        default: return 'text-gray-600 bg-gray-100'
      }
    }

    return (
      <div className="border-b border-gray-200 pb-3 mb-3 last:border-b-0 last:pb-0 last:mb-0">
        <div className="flex items-start space-x-3">
          <div className={`p-2 rounded-full ${getActionColor()}`}>
            {getActionIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-900">{action.action}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getCategoryColor()}`}>
                  {action.category}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                {action.duration && (
                  <span className="text-xs text-gray-500">{action.duration}ms</span>
                )}
                <span className="text-xs text-gray-500">
                  {formatTimeForChart(action.timestamp)}
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 mt-1">{action.details}</p>
          </div>
        </div>
      </div>
    )
  }

  const ActivityFilterPanel: React.FC = () => {
    const actionTypes = ['API_CALL', 'DATA_COLLECTION', 'RATE_LIMIT', 'DATABASE', 'SUCCESS', 'WARNING', 'ERROR']
    const categories = ['SYSTEM', 'USER', 'EXTERNAL', 'INTERNAL']
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']

    return (
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        <div className="space-y-4">
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <label className="text-sm font-medium text-gray-700 mb-2 block">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  value={activityFilter.searchTerm}
                  onChange={(e) => setActivityFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
                  placeholder="Search actions..."
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Time Range</label>
              <select
                value={activityFilter.timeRange}
                onChange={(e) => setActivityFilter(prev => ({ ...prev, timeRange: e.target.value as ActivityFilter['timeRange'] }))}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="5m">Last 5 minutes</option>
                <option value="15m">Last 15 minutes</option>
                <option value="1h">Last hour</option>
                <option value="6h">Last 6 hours</option>
                <option value="24h">Last 24 hours</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Action Type</label>
              <div className="space-y-2 max-h-32 overflow-y-auto">
                {actionTypes.map(type => (
                  <label key={type} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={activityFilter.type.includes(type)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActivityFilter(prev => ({ 
                            ...prev, 
                            type: [...(Array.isArray(prev.type) ? prev.type : []), type] 
                          }))
                        } else {
                          setActivityFilter(prev => ({ 
                            ...prev, 
                            type: (Array.isArray(prev.type) ? prev.type : []).filter(t => t !== type) 
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{type}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <div className="space-y-2">
                {categories.map(category => (
                  <label key={category} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={activityFilter.category.includes(category)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActivityFilter(prev => ({ 
                            ...prev, 
                            category: [...(Array.isArray(prev.category) ? prev.category : []), category] 
                          }))
                        } else {
                          setActivityFilter(prev => ({ 
                            ...prev, 
                            category: (Array.isArray(prev.category) ? prev.category : []).filter(c => c !== category) 
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{category}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Severity</label>
              <div className="space-y-2">
                {severities.map(severity => (
                  <label key={severity} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={activityFilter.severity.includes(severity)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setActivityFilter(prev => ({ 
                            ...prev, 
                            severity: [...(Array.isArray(prev.severity) ? prev.severity : []), severity] 
                          }))
                        } else {
                          setActivityFilter(prev => ({ 
                            ...prev, 
                            severity: (Array.isArray(prev.severity) ? prev.severity : []).filter(s => s !== severity) 
                          }))
                        }
                      }}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">{severity}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-200">
            <button
              onClick={() => setActivityFilter({
                type: [],
                category: [],
                severity: [],
                timeRange: '1h',
                searchTerm: ''
              })}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear all filters
            </button>
            <span className="text-sm text-gray-500">
              {filteredActions.length} actions found
            </span>
          </div>
        </div>
      </div>
    )
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
            <div className={`flex items-center space-x-4`}>
              <div className={`flex items-center space-x-2`}>
                <Database className={`h-4 w-4 ${isConnectedToMongo ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${isConnectedToMongo ? 'text-green-600' : 'text-red-600'}`}>
                  MongoDB {isConnectedToMongo ? 'Connected' : 'Disconnected'}
                </span>
              </div>
              
              <div className={`flex items-center space-x-2`}>
                <Wifi className={`h-4 w-4 ${isWebSocketConnected ? 'text-green-500' : 'text-red-500'}`} />
                <span className={`text-sm font-medium ${isWebSocketConnected ? 'text-green-600' : 'text-red-600'}`}>
                  WebSocket {connectionStatus}
                </span>
              </div>
            </div>
            
            {notifications.length > 0 && (
              <div className={`flex items-center space-x-2`}>
                <Bell className={`h-4 w-4 text-orange-500 animate-pulse`} />
                <span className={`text-sm font-medium text-orange-600`}>
                  {notifications.length} alert{notifications.length > 1 ? 's' : ''}
                </span>
              </div>
            )}
            
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
              onClick={() => setShowActivityFeed(!showActivityFeed)}
              className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${
                showActivityFeed 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Activity className={`h-4 w-4 mr-2`} />
              Activity Feed
            </button>
            
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
            <LineChart data={Array.isArray(liveData) ? liveData : []} accessibilityLayer>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="5 5" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTimeForChart}
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
            <LineChart data={Array.isArray(liveData) ? liveData : []} accessibilityLayer>
              <CartesianGrid stroke="#f0f0f0" strokeDasharray="5 5" />
              <XAxis 
                dataKey="timestamp" 
                tickFormatter={formatTimeForChart}
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
                <StatusIndicator status={systemStatus?.dataCollection?.isActive ? 'ACTIVE' : 'INACTIVE'} />
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Total Collections</span>
                <span className={`font-medium`}>{systemStatus?.dataCollection?.totalCollections?.toLocaleString() || '0'}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Success Rate</span>
                <span className={`font-medium text-green-600`}>{systemStatus?.dataCollection?.successRate || '0%'}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Uptime</span>
                <span className={`font-medium`}>{formatUptime(systemStatus?.dataCollection?.uptime || 0)}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Avg Response</span>
                <span className={`font-medium`}>{systemStatus?.dataCollection?.averageResponseTime || '0ms'}</span>
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
                <StatusIndicator status={(systemStatus?.apiRateLimiting?.status as 'HEALTHY' | 'THROTTLED' | 'COOLDOWN' | 'OVERLOADED' | 'ACTIVE' | 'INACTIVE') || 'INACTIVE'} />
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Requests/min</span>
                <span className={`font-medium`}>
                  {systemStatus?.apiRateLimiting?.requestsInLastMinute || 0}/{systemStatus?.apiRateLimiting?.maxRequestsPerMinute || 0}
                </span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Requests/hour</span>
                <span className={`font-medium`}>
                  {systemStatus?.apiRateLimiting?.requestsInLastHour || 0}/{systemStatus?.apiRateLimiting?.maxRequestsPerHour || 0}
                </span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Queue Length</span>
                <span className={`font-medium`}>{systemStatus?.apiRateLimiting?.queueLength || 0}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Rate Limited</span>
                <span className={`font-medium text-green-600`}>{systemStatus?.apiRateLimiting?.rateLimitedRequests || 0}</span>
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
                <span className={`font-medium`}>{systemStatus?.smartItemSelection?.totalSelected || 0}/{systemStatus?.smartItemSelection?.capacity || 0}</span>
              </div>
              <div className={`flex justify-between items-center`}>
                <span className={`text-sm text-gray-600`}>Utilization</span>
                <span className={`font-medium text-purple-600`}>{systemStatus?.smartItemSelection?.utilizationPercent || '0%'}</span>
              </div>
              <div className={`mt-4`}>
                <div className={`w-full bg-gray-200 rounded-full h-2`}>
                  <div 
                    className={`bg-purple-600 h-2 rounded-full transition-all duration-500`}
                    style={{ width: systemStatus?.smartItemSelection?.utilizationPercent || '0%' }}
                  />
                </div>
              </div>
              <div className={`text-xs text-gray-500 mt-2`}>
                {systemStatus?.smartItemSelection?.efficiency || 'Loading...'}
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
                {efficiencyMetrics?.smartSelection?.reductionPercent || '0%'}
              </div>
              <div className={`text-sm font-medium text-gray-900 mb-1`}>Fewer Items to Process</div>
              <div className={`text-xs text-gray-500`}>
                Tracking {efficiencyMetrics?.smartSelection?.itemsTracked || 0} instead of {efficiencyMetrics?.smartSelection?.totalOSRSItems?.toLocaleString() || '0'}
              </div>
            </div>

            {/* API Usage Efficiency */}
            <div className={`text-center`}>
              <div className={`text-3xl font-bold text-green-600 mb-2`}>
                {efficiencyMetrics?.apiUsage?.compliance || 'Unknown'}
              </div>
              <div className={`text-sm font-medium text-gray-900 mb-1`}>API Compliance</div>
              <div className={`text-xs text-gray-500`}>
                {efficiencyMetrics?.apiUsage?.totalSavedRequests || 'Calculating...'}
              </div>
            </div>

            {/* Performance Improvement */}
            <div className={`text-center`}>
              <div className={`text-3xl font-bold text-blue-600 mb-2`}>
                {efficiencyMetrics?.performance?.estimatedTimeReduction || '0%'}
              </div>
              <div className={`text-sm font-medium text-gray-900 mb-1`}>Time Reduction</div>
              <div className={`text-xs text-gray-500`}>
                {efficiencyMetrics?.performance?.reducedMemoryUsage || '0%'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Activity Feed */}
      {showActivityFeed && (
        <div className={`mt-6 grid grid-cols-1 ${isFilterOpen ? 'lg:grid-cols-3' : 'lg:grid-cols-1'} gap-6`}>
          {isFilterOpen && (
            <div className={`lg:col-span-1`}>
              <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
                <div className={`flex items-center justify-between mb-4`}>
                  <h3 className={`text-lg font-semibold text-gray-900`}>Activity Filters</h3>
                  <button
                    onClick={() => setIsFilterOpen(false)}
                    className={`text-gray-400 hover:text-gray-600`}
                  >
                    <XCircle className={`h-5 w-5`} />
                  </button>
                </div>
                <ActivityFilterPanel />
              </div>
            </div>
          )}
          
          <div className={`${isFilterOpen ? 'lg:col-span-2' : 'lg:col-span-1'}`}>
            <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6`}>
              <div className={`flex items-center justify-between mb-6`}>
                <div className={`flex items-center space-x-3`}>
                  <Activity className={`h-6 w-6 text-blue-600`} />
                  <h3 className={`text-lg font-semibold text-gray-900`}>Real-time Activity Feed</h3>
                  <div className={`flex items-center space-x-2`}>
                    <div className={`w-2 h-2 bg-green-400 rounded-full animate-pulse`} />
                    <span className={`text-green-400 text-sm font-medium`}>LIVE</span>
                  </div>
                </div>
                
                <div className={`flex items-center space-x-2`}>
                  <button
                    onClick={() => setIsFilterOpen(!isFilterOpen)}
                    className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors ${
                      isFilterOpen 
                        ? 'bg-blue-600 text-white hover:bg-blue-700' 
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                  >
                    <Filter className={`h-4 w-4 mr-2`} />
                    Filter
                  </button>
                  
                  <button
                    onClick={() => {
                      const exportData = {
                        timestamp: new Date().toISOString(),
                        actions: filteredActions,
                        filters: activityFilter
                      }
                      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
                      const url = URL.createObjectURL(blob)
                      const a = document.createElement('a')
                      a.href = url
                      a.download = `activity-feed-${Date.now()}.json`
                      a.click()
                      URL.revokeObjectURL(url)
                    }}
                    className={`flex items-center px-3 py-2 rounded-lg font-medium transition-colors bg-gray-200 text-gray-700 hover:bg-gray-300`}
                  >
                    <Download className={`h-4 w-4 mr-2`} />
                    Export
                  </button>
                </div>
              </div>
              
              <div className={`mb-4 flex items-center justify-between`}>
                <div className={`flex items-center space-x-4`}>
                  <span className={`text-sm text-gray-500`}>
                    Showing {filteredActions.length} of {systemActions.length} actions
                  </span>
                  <div className={`flex items-center space-x-2`}>
                    <RefreshCw className={`h-4 w-4 text-gray-400`} />
                    <span className={`text-sm text-gray-500`}>
                      Auto-refresh every {refreshInterval / 1000}s
                    </span>
                  </div>
                </div>
                
                {notifications.length > 0 && (
                  <div className={`flex items-center space-x-2`}>
                    <button
                      onClick={() => setNotifications([])}
                      className={`text-sm text-gray-500 hover:text-gray-700`}
                    >
                      Clear alerts
                    </button>
                  </div>
                )}
              </div>
              
              <div className={`max-h-96 overflow-y-auto`}>
                {filteredActions.length === 0 ? (
                  <div className={`text-center py-8`}>
                    <Activity className={`h-12 w-12 text-gray-400 mx-auto mb-4`} />
                    <p className={`text-gray-500`}>No activities found matching your filters</p>
                    <button
                      onClick={() => setActivityFilter({
                        type: [],
                        category: [],
                        severity: [],
                        timeRange: '1h',
                        searchTerm: ''
                      })}
                      className={`mt-2 text-blue-600 hover:text-blue-800`}
                    >
                      Clear all filters
                    </button>
                  </div>
                ) : (
                  <div className={`space-y-3`}>
                    {filteredActions.map(action => (
                      <ActivityFeedItem key={action.id} action={action} />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Console Output */}
      <div className={`bg-black rounded-lg shadow-sm border border-gray-200 p-6 mt-6`}>
        <div className={`flex items-center justify-between mb-4`}>
          <h3 className={`text-lg font-semibold text-green-400`}>Live Console Output</h3>
          <div className={`flex items-center space-x-4`}>
            <div className={`flex items-center space-x-2`}>
              <div className={`w-2 h-2 ${isWebSocketConnected ? 'bg-green-400' : 'bg-red-400'} rounded-full ${isWebSocketConnected ? 'animate-pulse' : ''}`} />
              <span className={`text-sm ${isWebSocketConnected ? 'text-green-400' : 'text-red-400'}`}>
                {isWebSocketConnected ? 'LIVE' : 'DISCONNECTED'}
              </span>
            </div>
            {webSocketError && (
              <span className={`text-xs text-red-400`}>
                {webSocketError}
              </span>
            )}
          </div>
        </div>
        <div className={`bg-black text-green-400 font-mono text-sm space-y-1 max-h-64 overflow-y-auto`}>
          {logEntries.length === 0 ? (
            <div className={`text-gray-500 text-center py-4`}>
              {isWebSocketConnected ? 'Waiting for log messages...' : 'WebSocket disconnected. No logs available.'}
            </div>
          ) : (
            logEntries.map((entry, index) => {
              const getLogColor = (level: string) => {
                switch (level) {
                  case 'error': return 'text-red-400'
                  case 'warn': return 'text-yellow-400'
                  case 'debug': return 'text-blue-400'
                  default: return 'text-green-400'
                }
              }
              
              return (
                <div key={`${entry.timestamp}-${index}`} className={`${getLogColor(entry.level)}`}>
                  <span className={`text-gray-500`}>[{formatTime(entry.timestamp)}]</span>
                  <span className={`text-gray-300`}> [{entry.service}]</span>
                  <span className={`ml-2`}>{entry.message}</span>
                  {entry.traceId && (
                    <span className={`text-gray-500 ml-2`}>(trace: {entry.traceId})</span>
                  )}
                  {entry.itemId && (
                    <span className={`text-gray-500 ml-2`}>(item: {entry.itemId})</span>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}

export default LiveMonitoringDashboard