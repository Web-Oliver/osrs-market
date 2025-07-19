import React, { useState, useEffect } from 'react';
import { Brain, TrendingUp, TrendingDown, DollarSign, Clock, Target, AlertCircle, Database } from 'lucide-react';

interface AIDecision {
  id: string;
  timestamp: Date;
  itemId: number;
  itemName: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  predictedProfit: number;
  currentPrice: number;
  targetPrice: number;
  reasoning: string[];
  technicalIndicators: {
    rsi: number;
    macd: number;
    volume: number;
    volatility: number;
  };
  outcome?: {
    executed: boolean;
    actualProfit?: number;
    timeToComplete?: number;
  };
}

interface PerformanceMetrics {
  totalDecisions: number;
  successRate: number;
  totalProfit: number;
  averageProfit: number;
  decisionsToday: number;
  confidenceDistribution: {
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
  };
}

const AITradingVisualizer: React.FC = () => {
  const [aiDecisions, setAIDecisions] = useState<AIDecision[]>([]);
  const [performanceMetrics, setPerformanceMetrics] = useState<PerformanceMetrics>({
    totalDecisions: 0,
    successRate: 0,
    totalProfit: 0,
    averageProfit: 0,
    decisionsToday: 0,
    confidenceDistribution: {
      high_confidence: 0,
      medium_confidence: 0,
      low_confidence: 0
    }
  });
  const [selectedDecision, setSelectedDecision] = useState<AIDecision | null>(null);
  const [viewMode, setViewMode] = useState<'decisions' | 'performance' | 'learning'>('decisions');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch real AI trading data from backend
  useEffect(() => {
    const fetchRealAIData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch AI trading sessions from backend
        const response = await fetch('/api/ai-trading/sessions');
        
        if (!response.ok) {
          throw new Error(`Failed to fetch AI data: ${response.status}`);
        }

        const result = await response.json();
        
        if (result.success && result.data && Array.isArray(result.data)) {
          // Process real AI trading data
          const realDecisions: AIDecision[] = result.data.map((session: any) => ({
            id: session.id || `session_${Date.now()}`,
            timestamp: new Date(session.createdAt || session.startTime || Date.now()),
            itemId: session.itemId || 0,
            itemName: session.itemName || `Item ${session.itemId || 'Unknown'}`,
            action: session.action || 'HOLD',
            confidence: session.confidence || 0,
            predictedProfit: session.predictedProfit || 0,
            currentPrice: session.currentPrice || 0,
            targetPrice: session.targetPrice || 0,
            reasoning: session.reasoning || ['Real AI analysis from backend'],
            technicalIndicators: session.technicalIndicators || {
              rsi: 0,
              macd: 0,
              volume: 0,
              volatility: 0
            },
            outcome: session.outcome
          }));

          setAIDecisions(realDecisions);

          // Calculate real performance metrics
          const totalDecisions = realDecisions.length;
          const executedDecisions = realDecisions.filter(d => d.outcome?.executed);
          const successfulDecisions = executedDecisions.filter(d => (d.outcome?.actualProfit || 0) > 0);
          const totalProfit = executedDecisions.reduce((sum, d) => sum + (d.outcome?.actualProfit || 0), 0);
          const today = new Date().toDateString();
          const decisionsToday = realDecisions.filter(d => d.timestamp.toDateString() === today).length;
          
          const highConf = realDecisions.filter(d => d.confidence > 0.8).length;
          const medConf = realDecisions.filter(d => d.confidence > 0.6 && d.confidence <= 0.8).length;
          const lowConf = realDecisions.filter(d => d.confidence <= 0.6).length;

          setPerformanceMetrics({
            totalDecisions,
            successRate: executedDecisions.length > 0 ? (successfulDecisions.length / executedDecisions.length) * 100 : 0,
            totalProfit,
            averageProfit: executedDecisions.length > 0 ? totalProfit / executedDecisions.length : 0,
            decisionsToday,
            confidenceDistribution: {
              high_confidence: highConf,
              medium_confidence: medConf,
              low_confidence: lowConf
            }
          });
        } else {
          // No AI sessions found
          setAIDecisions([]);
          setPerformanceMetrics({
            totalDecisions: 0,
            successRate: 0,
            totalProfit: 0,
            averageProfit: 0,
            decisionsToday: 0,
            confidenceDistribution: {
              high_confidence: 0,
              medium_confidence: 0,
              low_confidence: 0
            }
          });
        }
      } catch (error) {
        console.error('Failed to fetch AI trading data:', error);
        setError(error.message);
        setAIDecisions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRealAIData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchRealAIData, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatGP = (value: number) => {
    if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
    return value.toLocaleString();
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'BUY': return 'text-green-600 bg-green-100';
      case 'SELL': return 'text-red-600 bg-red-100';
      case 'HOLD': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600';
    if (confidence > 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600">Loading AI trading data from backend...</p>
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
            <h1 className="text-4xl font-bold text-gray-900 mb-2">AI Trading Visualizer</h1>
            <p className="text-xl text-gray-600">Real AI trading decisions and performance analysis</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 text-green-800 rounded-lg">
              <Brain className="w-4 h-4" />
              <span className="text-sm font-medium">AI System Active</span>
            </div>
          </div>
        </div>

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <span className="text-red-800">Failed to load AI trading data: {error}</span>
            </div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !error && aiDecisions.length === 0 && (
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
            <div className="text-center">
              <Database className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No AI Trading Data</h3>
              <p className="text-gray-600">No AI trading sessions found. Start an AI trading session to see real data here.</p>
              <button 
                onClick={() => window.location.href = '/ai-trading'}
                className="mt-4 osrs-button-primary"
              >
                Start AI Trading
              </button>
            </div>
          </div>
        )}

        {/* View Mode Tabs */}
        {aiDecisions.length > 0 && (
          <>
            <div className="flex space-x-4 bg-white rounded-lg p-1 shadow-sm border border-gray-200">
              <button
                onClick={() => setViewMode('decisions')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  viewMode === 'decisions' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                AI Decisions
              </button>
              <button
                onClick={() => setViewMode('performance')}
                className={`px-4 py-2 rounded-md transition-colors ${
                  viewMode === 'performance' ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                Performance
              </button>
            </div>

            {/* Performance Metrics */}
            {viewMode === 'performance' && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <Target className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Decisions</p>
                      <p className="text-2xl font-bold text-gray-900">{performanceMetrics.totalDecisions}</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <TrendingUp className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-600">Success Rate</p>
                      <p className="text-2xl font-bold text-gray-900">{performanceMetrics.successRate.toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-sm text-gray-600">Total Profit</p>
                      <p className="text-2xl font-bold text-gray-900">{formatGP(performanceMetrics.totalProfit)} GP</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-6">
                  <div className="flex items-center space-x-3">
                    <Clock className="w-8 h-8 text-orange-600" />
                    <div>
                      <p className="text-sm text-gray-600">Decisions Today</p>
                      <p className="text-2xl font-bold text-gray-900">{performanceMetrics.decisionsToday}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* AI Decisions */}
            {viewMode === 'decisions' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                
                {/* Decisions List */}
                <div className="lg:col-span-2 bg-white rounded-xl shadow-lg border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">Recent AI Decisions</h3>
                    <p className="text-sm text-gray-600 mt-1">Real trading decisions from AI system</p>
                  </div>
                  
                  <div className="p-6 space-y-4 max-h-96 overflow-y-auto">
                    {aiDecisions.map((decision) => (
                      <div
                        key={decision.id}
                        onClick={() => setSelectedDecision(decision)}
                        className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(decision.action)}`}>
                              {decision.action}
                            </span>
                            <span className="font-medium text-gray-900">{decision.itemName}</span>
                          </div>
                          <span className="text-xs text-gray-500">{formatTime(decision.timestamp)}</span>
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm text-gray-600">
                              Price: {formatGP(decision.currentPrice)} GP
                            </p>
                            <p className={`text-sm font-medium ${getConfidenceColor(decision.confidence)}`}>
                              Confidence: {(decision.confidence * 100).toFixed(0)}%
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm text-gray-600">Predicted Profit</p>
                            <p className={`font-medium ${decision.predictedProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {decision.predictedProfit > 0 ? '+' : ''}{formatGP(decision.predictedProfit)} GP
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Decision Detail */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="text-xl font-semibold text-gray-900">Decision Details</h3>
                  </div>
                  
                  <div className="p-6">
                    {selectedDecision ? (
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium text-gray-900 mb-2">{selectedDecision.itemName}</h4>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Action:</span>
                              <span className={`font-medium ${getActionColor(selectedDecision.action).split(' ')[0]}`}>
                                {selectedDecision.action}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Confidence:</span>
                              <span className={`font-medium ${getConfidenceColor(selectedDecision.confidence)}`}>
                                {(selectedDecision.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Current Price:</span>
                              <span className="font-medium">{formatGP(selectedDecision.currentPrice)} GP</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Target Price:</span>
                              <span className="font-medium">{formatGP(selectedDecision.targetPrice)} GP</span>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h5 className="font-medium text-gray-900 mb-2">AI Reasoning</h5>
                          <ul className="space-y-1 text-sm text-gray-600">
                            {selectedDecision.reasoning.map((reason, index) => (
                              <li key={index} className="flex items-start space-x-2">
                                <span className="text-blue-600 mt-1">•</span>
                                <span>{reason}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        {selectedDecision.outcome && (
                          <div>
                            <h5 className="font-medium text-gray-900 mb-2">Outcome</h5>
                            <div className="text-sm space-y-1">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Status:</span>
                                <span className={`font-medium ${selectedDecision.outcome.executed ? 'text-green-600' : 'text-gray-600'}`}>
                                  {selectedDecision.outcome.executed ? 'Executed' : 'Pending'}
                                </span>
                              </div>
                              {selectedDecision.outcome.actualProfit && (
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Actual Profit:</span>
                                  <span className={`font-medium ${selectedDecision.outcome.actualProfit > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                    {selectedDecision.outcome.actualProfit > 0 ? '+' : ''}{formatGP(selectedDecision.outcome.actualProfit)} GP
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center text-gray-500">
                        <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p>Select a decision to view details</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AITradingVisualizer;