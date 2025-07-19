import React from 'react';
import { TrendingUp, TrendingDown, AlertTriangle, Target, DollarSign, Activity, BarChart, Zap } from 'lucide-react';

interface MetricsCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: 'trending-up' | 'trending-down' | 'alert' | 'target' | 'dollar' | 'activity' | 'chart' | 'zap';
  subtitle?: string;
  className?: string;
  showSparkline?: boolean;
  sparklineData?: number[];
}

const MetricsCard: React.FC<MetricsCardProps> = ({
  title,
  value,
  change,
  changeType = 'neutral',
  icon = 'chart',
  subtitle,
  className = '',
  showSparkline = false,
  sparklineData = []
}) => {
  const getIcon = () => {
    const iconProps = { className: 'w-6 h-6' };
    
    switch (icon) {
      case 'trending-up':
        return <TrendingUp {...iconProps} />;
      case 'trending-down':
        return <TrendingDown {...iconProps} />;
      case 'alert':
        return <AlertTriangle {...iconProps} />;
      case 'target':
        return <Target {...iconProps} />;
      case 'dollar':
        return <DollarSign {...iconProps} />;
      case 'activity':
        return <Activity {...iconProps} />;
      case 'zap':
        return <Zap {...iconProps} />;
      default:
        return <BarChart {...iconProps} />;
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600';
      case 'negative':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getIconColor = () => {
    switch (changeType) {
      case 'positive':
        return 'text-green-600 bg-green-100';
      case 'negative':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const formatChange = (change: number) => {
    const prefix = change >= 0 ? '+' : '';
    if (Math.abs(change) >= 1000000) {
      return `${prefix}${(change / 1000000).toFixed(1)}M`;
    }
    if (Math.abs(change) >= 1000) {
      return `${prefix}${(change / 1000).toFixed(0)}K`;
    }
    return `${prefix}${change.toFixed(0)}`;
  };

  const renderSparkline = () => {
    if (!showSparkline || sparklineData.length === 0) return null;

    const max = Math.max(...sparklineData);
    const min = Math.min(...sparklineData);
    const range = max - min;

    const points = sparklineData.map((value, index) => {
      const x = (index / (sparklineData.length - 1)) * 100;
      const y = range === 0 ? 50 : ((max - value) / range) * 100;
      return `${x},${y}`;
    }).join(' ');

    const trend = sparklineData[sparklineData.length - 1] > sparklineData[0];

    return (
      <div className="mt-2">
        <svg className="w-full h-8" viewBox="0 0 100 100" preserveAspectRatio="none">
          <polyline
            fill="none"
            stroke={trend ? '#10B981' : '#EF4444'}
            strokeWidth="2"
            points={points}
          />
          <defs>
            <linearGradient id={`gradient-${title}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" style={{ stopColor: trend ? '#10B981' : '#EF4444', stopOpacity: 0.3 }} />
              <stop offset="100%" style={{ stopColor: trend ? '#10B981' : '#EF4444', stopOpacity: 0.05 }} />
            </linearGradient>
          </defs>
          <polygon
            fill={`url(#gradient-${title})`}
            points={`0,100 ${points} 100,100`}
          />
        </svg>
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-xl shadow-lg border border-gray-200 p-6 hover:shadow-xl transition-all duration-300 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-lg ${getIconColor()}`}>
          {getIcon()}
        </div>
        {change !== undefined && (
          <div className={`flex items-center space-x-1 ${getChangeColor()}`}>
            {changeType === 'positive' ? (
              <TrendingUp className="w-4 h-4" />
            ) : changeType === 'negative' ? (
              <TrendingDown className="w-4 h-4" />
            ) : null}
            <span className="font-semibold text-sm">
              {formatChange(change)}
            </span>
          </div>
        )}
      </div>

      {/* Content */}
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
        {subtitle && (
          <p className="text-sm text-gray-500">{subtitle}</p>
        )}
      </div>

      {/* Sparkline */}
      {renderSparkline()}
    </div>
  );
};

export default MetricsCard;