// Mock data generators for training charts
export interface TrainingDataPoint {
  timestamp: string;
  loss: number;
  reward: number;
  epsilon: number;
  portfolioValue: number;
}

export const generateMockTrainingData = (points: number = 20): TrainingDataPoint[] => {
  const data: TrainingDataPoint[] = [];
  const now = Date.now();
  
  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - (points - i) * 300000).toISOString(); // 5 minute intervals
    
    // Simulate loss decreasing over time with some noise
    const loss = Math.max(0.1, 2.0 - (i / points) * 1.5 + Math.random() * 0.3);
    
    // Simulate reward increasing over time with some volatility
    const reward = Math.max(-100, (i / points) * 500 + Math.random() * 100 - 50);
    
    // Simulate epsilon decay
    const epsilon = Math.max(0.01, 0.9 - (i / points) * 0.89);
    
    // Simulate portfolio value generally increasing
    const portfolioValue = Math.max(100000, 100000 + (i / points) * 50000 + Math.random() * 10000 - 5000);
    
    data.push({
      timestamp,
      loss,
      reward,
      epsilon,
      portfolioValue
    });
  }
  
  return data;
};

export const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value).replace('$', '') + ' GP';
};

export const formatPercentage = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

// Mock data for Auto Training Dashboard
export interface AutoTrainingMetric {
  episode: number;
  totalReward: number;
  successRate: number;
  profitability: number;
  epsilon: number;
}

export const generateMockAutoTrainingMetrics = (episodes: number = 30): AutoTrainingMetric[] => {
  const metrics: AutoTrainingMetric[] = [];
  
  for (let i = 1; i <= episodes; i++) {
    // Simulate gradual improvement in training
    const progressFactor = i / episodes;
    
    // Total reward should generally increase with some volatility
    const totalReward = Math.max(-50, (progressFactor * 100) + Math.random() * 30 - 15);
    
    // Success rate should improve over time
    const successRate = Math.min(95, 40 + (progressFactor * 55) + Math.random() * 10 - 5);
    
    // Profitability should improve as training progresses
    const profitability = Math.floor(
      (progressFactor * 50000) + Math.random() * 20000 - 10000
    );
    
    // Epsilon should decay
    const epsilon = Math.max(0.01, 0.9 - (progressFactor * 0.89) + Math.random() * 0.1 - 0.05);
    
    metrics.push({
      episode: i,
      totalReward,
      successRate,
      profitability,
      epsilon
    });
  }
  
  return metrics;
};