import { useState } from 'react'
import { TradingDashboard } from './components/TradingDashboard'
import { AITradingDashboard } from './components/AITradingDashboard'
import { AutoTrainingDashboard } from './components/AutoTrainingDashboard'
import LiveMonitoringDashboard from './components/LiveMonitoringDashboard'
import ItemsAnalysis from './components/ItemsAnalysis'
import SystemOverview from './components/SystemOverview'
import AITradingVisualizer from './components/AITradingVisualizer'
import LiveMarketFeed from './components/LiveMarketFeed'
import { NotificationToast } from './components/NotificationToast'
import { useNotifications } from './hooks/useNotifications'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analysis' | 'ai-viz' | 'live-feed' | 'manual' | 'ai' | 'auto' | 'monitoring'>('overview')
  const { notifications, showSuccess, showError, showWarning, showInfo, dismissNotification } = useNotifications()

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">OSRS Market Tracker</h1>
              <p className="text-gray-600 mt-1">Advanced market analysis with AI-powered trading</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Real-time data from</p>
              <p className="text-sm font-medium text-blue-600">RuneScape Wiki API</p>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-6 border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🏠 System Overview
              </button>
              <button
                onClick={() => setActiveTab('analysis')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'analysis'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔍 Items Analysis
              </button>
              <button
                onClick={() => setActiveTab('ai-viz')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ai-viz'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🧠 AI Intelligence
              </button>
              <button
                onClick={() => setActiveTab('live-feed')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'live-feed'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📡 Live Feed
              </button>
              <button
                onClick={() => setActiveTab('manual')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'manual'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Manual Trading
              </button>
              <button
                onClick={() => setActiveTab('ai')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'ai'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🤖 AI Trading
              </button>
              <button
                onClick={() => setActiveTab('auto')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'auto'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                🔄 Auto Training
              </button>
              <button
                onClick={() => setActiveTab('monitoring')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'monitoring'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                📊 Live Monitoring
              </button>
            </nav>
          </div>
        </div>
      </header>
      
      <main className={activeTab === 'analysis' || activeTab === 'overview' || activeTab === 'ai-viz' || activeTab === 'live-feed' ? '' : 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'}>
        {activeTab === 'overview' && <SystemOverview />}
        {activeTab === 'analysis' && <ItemsAnalysis />}
        {activeTab === 'ai-viz' && <AITradingVisualizer />}
        {activeTab === 'live-feed' && <LiveMarketFeed />}
        {activeTab === 'manual' && <TradingDashboard />}
        {activeTab === 'ai' && <AITradingDashboard />}
        {activeTab === 'auto' && <AutoTrainingDashboard />}
        {activeTab === 'monitoring' && <LiveMonitoringDashboard />}
      </main>
      
      <footer className="bg-white border-t border-gray-200 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center text-sm text-gray-500">
            <p>Built for OSRS traders • Data provided by RuneScape Wiki • Not affiliated with Jagex</p>
            <p className="mt-1">⚠️ Use at your own risk • Always verify prices in-game before trading</p>
            <p className="mt-1">🤖 AI trading is experimental • Past performance doesn't guarantee future results</p>
            
            {/* Demo Notification Buttons */}
            <div className="mt-4 flex justify-center gap-2">
              <button
                onClick={() => showSuccess('Operation completed successfully!')}
                className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
              >
                Success Toast
              </button>
              <button
                onClick={() => showError('Something went wrong!')}
                className="px-3 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
              >
                Error Toast
              </button>
              <button
                onClick={() => showWarning('Please check your input!')}
                className="px-3 py-1 bg-yellow-600 text-white text-xs rounded hover:bg-yellow-700"
              >
                Warning Toast
              </button>
              <button
                onClick={() => showInfo('New data available!')}
                className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
              >
                Info Toast
              </button>
            </div>
          </div>
        </div>
      </footer>
      
      {/* Notification Container */}
      <div className="fixed top-0 right-0 z-50 pointer-events-none">
        {notifications.map((notification, index) => (
          <div
            key={notification.id}
            className="pointer-events-auto"
            style={{
              marginTop: `${index * 80}px` // Stack notifications vertically
            }}
          >
            <NotificationToast
              id={notification.id}
              message={notification.message}
              type={notification.type}
              onDismiss={dismissNotification}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default App