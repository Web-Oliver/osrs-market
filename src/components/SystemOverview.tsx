import React, { useState, useEffect } from 'react';
import { Activity, Database, Zap, TrendingUp, Eye, AlertTriangle, CheckCircle, Clock, DollarSign, BarChart3, Brain, Cpu, HardDrive, Wifi, RefreshCw } from 'lucide-react';
import MetricsCard from './MetricsCard';

interface SystemStatus {
  database: {
    connected: boolean;
    itemCount: number;
    priceSnapshotCount: number;
    lastUpdate: Date;
  };
  apis: {
    osrsWiki: { status: 'online' | 'offline' | 'slow'; responseTime: number };
    backend: { status: 'online' | 'offline' | 'slow'; responseTime: number };
  };
  aiTrading: {
    isActive: boolean;
    sessionsRunning: number;
    lastDecision: Date | null;
    totalProfitToday: number;
  };
  scraping: {
    isActive: boolean;
    itemsScrapedToday: number;
    lastScrapeTime: Date | null;
    errorRate: number;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
  };
}

interface LiveActivity {
  id: string;
  timestamp: Date;
  type: 'scrape' | 'trade' | 'analysis' | 'error' | 'ai_decision';
  message: string;
  data?: any;
}

const SystemOverview: React.FC = () => {
  const [systemStatus, setSystemStatus] = useState<SystemStatus>({
    database: {
      connected: false,
      itemCount: 0,
      priceSnapshotCount: 0,
      lastUpdate: new Date()
    },
    apis: {
      osrsWiki: { status: 'offline', responseTime: 0 },
      backend: { status: 'offline', responseTime: 0 }
    },
    aiTrading: {
      isActive: false,
      sessionsRunning: 0,
      lastDecision: null,
      totalProfitToday: 0
    },
    scraping: {
      isActive: false,
      itemsScrapedToday: 0,
      lastScrapeTime: null,
      errorRate: 0
    },
    performance: {
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0
    }
  });

  const [liveActivity, setLiveActivity] = useState<LiveActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Fetch system status
  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        // Only show loading screen on initial load
        if (isInitialLoad) {
          setLoading(true);
        }
        
        // Fetch database status
        const healthResponse = await fetch('/api/health');
        const healthData = await healthResponse.json();
        
        // Fetch items count
        const itemsResponse = await fetch('/api/items?limit=1');
        const itemsData = await itemsResponse.json();
        
        // Fetch market data count
        const marketResponse = await fetch('/api/market-data/summary');
        const marketData = await marketResponse.json();
        
        // Fetch AI trading status
        const aiResponse = await fetch('/api/ai-trading/sessions');
        const aiData = await aiResponse.json();
        
        // Fetch live monitoring data
        const monitoringResponse = await fetch('/api/live-monitoring');
        const monitoringData = await monitoringResponse.json();

        setSystemStatus({
          database: {
            connected: healthData.success || false,
            itemCount: itemsData.data?.pagination?.totalCount || 0,
            priceSnapshotCount: marketData.data?.totalSnapshots || 0,
            lastUpdate: new Date()
          },
          apis: {
            osrsWiki: { 
              status: healthData.success ? 'online' : 'offline', 
              responseTime: healthData.responseTime || 0
            },
            backend: { 
              status: healthData.success ? 'online' : 'offline', 
              responseTime: healthData.backendResponseTime || 0
            }
          },
          aiTrading: {
            isActive: aiData.success && Array.isArray(aiData.data) && aiData.data.length > 0,
            sessionsRunning: Array.isArray(aiData.data) ? aiData.data.length : 0,
            lastDecision: Array.isArray(aiData.data) && aiData.data[0]?.lastUpdate ? new Date(aiData.data[0].lastUpdate) : null,
            totalProfitToday: Array.isArray(aiData.data) ? aiData.data.reduce((sum: number, session: any) => sum + (session.totalProfit || 0), 0) : 0
          },
          scraping: {
            isActive: monitoringData.success && monitoringData.data?.scraping?.isActive,
            itemsScrapedToday: monitoringData.data?.scraping?.itemsScrapedToday || 0,
            lastScrapeTime: monitoringData.data?.scraping?.lastScrapeTime ? new Date(monitoringData.data.scraping.lastScrapeTime) : null,
            errorRate: monitoringData.data?.scraping?.errorRate || 0
          },
          performance: {
            cpuUsage: monitoringData.data?.performance?.cpuUsage || 0,
            memoryUsage: monitoringData.data?.performance?.memoryUsage || 0,
            diskUsage: monitoringData.data?.performance?.diskUsage || 0
          }
        });

      } catch (error) {
        console.error('Failed to fetch system status:', error);
      } finally {
        if (isInitialLoad) {
          setLoading(false);
          setIsInitialLoad(false);
        }
      }
    };

    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, []);

  // Fetch real live activity feed from backend
  useEffect(() => {
    const fetchLiveActivity = async () => {
      try {
        const response = await fetch('/api/live-activity');
        if (response.ok) {
          const result = await response.json();
          if (result.success && result.data) {
            const realActivities: LiveActivity[] = result.data.map((activity: any, index: number) => ({
              id: activity.id || `activity_${Date.now()}_${index}`,
              timestamp: new Date(activity.timestamp || Date.now()),
              type: activity.type || 'analysis',
              message: activity.message || 'System activity',
              data: activity.data
            }));
            setLiveActivity(realActivities.slice(0, 50)); // Keep last 50 activities
          }
        }
      } catch (error) {
        console.error('Failed to fetch live activity:', error);
        // Set empty array instead of fake data
        setLiveActivity([]);
      }
    };

    fetchLiveActivity();
    const interval = setInterval(fetchLiveActivity, 10000); // Update every 10 seconds
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'online': return 'text-green-600';
      case 'slow': return 'text-yellow-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getActivityIcon = (type: LiveActivity['type']) => {
    switch (type) {
      case 'scrape': return <Database className="w-4 h-4" />;
      case 'trade': return <DollarSign className="w-4 h-4" />;
      case 'analysis': return <BarChart3 className="w-4 h-4" />;
      case 'ai_decision': return <Brain className="w-4 h-4" />;
      case 'error': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getActivityColor = (type: LiveActivity['type']) => {
    switch (type) {
      case 'scrape': return 'text-blue-600 bg-blue-50';
      case 'trade': return 'text-green-600 bg-green-50';
      case 'analysis': return 'text-purple-600 bg-purple-50';
      case 'ai_decision': return 'text-orange-600 bg-orange-50';
      case 'error': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatTime = (date: Date | null) => {
    if (!date) return 'Never';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Only show loading screen on very first load before any data is available
  if (loading && isInitialLoad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading system overview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">System Overview</h1>
            <p className="text-xl text-gray-600">Real-time monitoring of your OSRS trading system</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="animate-pulse w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Live</span>
            </div>
            <button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* System Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <MetricsCard
            title="Database Status"
            value={systemStatus.database.connected ? "Connected" : "Disconnected"}
            subtitle={`${formatNumber(systemStatus.database.itemCount)} items tracked`}
            icon="database"
            changeType={systemStatus.database.connected ? "positive" : "negative"}
            className={systemStatus.database.connected ? "border-green-200" : "border-red-200"}
          />
          
          <MetricsCard
            title="AI Trading"
            value={systemStatus.aiTrading.isActive ? "Active" : "Inactive"}
            subtitle={`${systemStatus.aiTrading.sessionsRunning} sessions running`}
            icon="zap"
            changeType={systemStatus.aiTrading.isActive ? "positive" : "neutral"}
          />
          
          <MetricsCard
            title="Data Scraping"
            value={systemStatus.scraping.isActive ? "Running" : "Stopped"}
            subtitle={`${formatNumber(systemStatus.scraping.itemsScrapedToday)} items today`}
            icon="activity"
            changeType={systemStatus.scraping.isActive ? "positive" : "neutral"}
          />
          
          <MetricsCard
            title="Total Profit"
            value={`${formatNumber(systemStatus.aiTrading.totalProfitToday)} GP`}
            subtitle="Today's trading profit"
            icon="dollar"
            changeType="positive"
            change={1250}
          />
        </div>

        {/* Detailed Status Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* API Status Panel */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">API Status</h3>
              <Wifi className="w-6 h-6 text-blue-600" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    systemStatus.apis.osrsWiki.status === 'online' ? 'bg-green-500' :
                    systemStatus.apis.osrsWiki.status === 'slow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">OSRS Wiki API</span>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${getStatusColor(systemStatus.apis.osrsWiki.status)}`}>
                    {systemStatus.apis.osrsWiki.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-500">{systemStatus.apis.osrsWiki.responseTime}ms</div>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    systemStatus.apis.backend.status === 'online' ? 'bg-green-500' :
                    systemStatus.apis.backend.status === 'slow' ? 'bg-yellow-500' : 'bg-red-500'
                  }`}></div>
                  <span className="font-medium">Backend API</span>
                </div>
                <div className="text-right">
                  <div className={`font-semibold ${getStatusColor(systemStatus.apis.backend.status)}`}>
                    {systemStatus.apis.backend.status.toUpperCase()}
                  </div>
                  <div className="text-sm text-gray-500">{systemStatus.apis.backend.responseTime}ms</div>
                </div>
              </div>
            </div>
          </div>

          {/* Performance Panel */}
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-gray-900">System Performance</h3>
              <Cpu className="w-6 h-6 text-purple-600" />
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">CPU Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${systemStatus.performance.cpuUsage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{systemStatus.performance.cpuUsage.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Memory Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-green-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${systemStatus.performance.memoryUsage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{systemStatus.performance.memoryUsage.toFixed(1)}%</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Disk Usage</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-yellow-600 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${systemStatus.performance.diskUsage}%` }}
                    ></div>
                  </div>
                  <span className="text-sm font-medium">{systemStatus.performance.diskUsage.toFixed(1)}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Activity Feed */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">Live Activity Feed</h3>
            <div className="flex items-center space-x-2">
              <Activity className="w-5 h-5 text-green-600" />
              <span className="text-sm text-gray-600">Real-time updates</span>
            </div>
          </div>
          
          <div className="max-h-96 overflow-y-auto space-y-3">
            {liveActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{activity.message}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-gray-500">{formatTime(activity.timestamp)}</span>
                    {activity.data && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        {activity.type === 'trade' && `+${activity.data.profit} GP`}
                        {activity.type === 'ai_decision' && `${(activity.data.confidence * 100).toFixed(0)}% confidence`}
                        {activity.type === 'scrape' && `${activity.data.price ? formatNumber(activity.data.price) + ' GP' : activity.data.count + ' items'}`}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button className="flex flex-col items-center space-y-2 p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
              <Zap className="w-6 h-6 text-blue-600" />
              <span className="text-sm font-medium">Start AI Trading</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
              <Database className="w-6 h-6 text-green-600" />
              <span className="text-sm font-medium">Force Data Sync</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              <span className="text-sm font-medium">Run Analysis</span>
            </button>
            <button className="flex flex-col items-center space-y-2 p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
              <Eye className="w-6 h-6 text-orange-600" />
              <span className="text-sm font-medium">View Logs</span>
            </button>
          </div>
        </div>
        
      </div>
    </div>
  );
};

export default SystemOverview;