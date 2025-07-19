# Frontend Integration Guide

## Overview

This document describes how the OSRS Market frontend integrates with the Node.js backend, which in turn communicates with the Python AI service.

## Integration Architecture

```
React Frontend (Port 3000)
    ↓ HTTP API calls
Node.js Backend (Port 3001)
    ↓ HTTP API calls via PythonRLClientService
Python AI Service (Port 8000)
    ↓ Model operations
File System (Models) + MongoDB (Data)
```

## Updated Frontend Configuration

### Environment Variables

The frontend now uses environment-based configuration:

```bash
# .env (create from .env.example)
VITE_NODE_API_URL=http://localhost:3001
VITE_OSRS_WIKI_API_URL=https://prices.runescape.wiki/api/v1/osrs
VITE_APP_ENV=development
VITE_ENABLE_WEBSOCKETS=true
VITE_ENABLE_REAL_TIME_UPDATES=true
```

## API Service Integration

### 1. AI Trading Service (`aiTradingApi.ts`)

**Endpoints Used:**
```typescript
// Session Management
POST   /api/ai-trading/sessions
DELETE /api/ai-trading/sessions/{id}
POST   /api/ai-trading/sessions/{id}/pause
POST   /api/ai-trading/sessions/{id}/resume
GET    /api/ai-trading/sessions
GET    /api/ai-trading/system-status

// Trading Operations
POST   /api/ai-trading/sessions/{id}/process-market-data
POST   /api/ai-trading/signals

// Analytics & Progress
GET    /api/ai-trading/sessions/{id}/progress
GET    /api/ai-trading/sessions/{id}/analytics

// Model Management
POST   /api/ai-trading/sessions/{id}/save-model
POST   /api/ai-trading/sessions/{id}/load-model
GET    /api/ai-trading/sessions/{id}/export

// Configuration
PUT    /api/ai-trading/sessions/{id}/adaptive-config
```

**Backend Integration:**
- All calls go through `AITradingController.js`
- Controller uses `AITradingOrchestratorService.js`
- Orchestrator uses `PythonRLClientService.js` to call Python AI service
- Responses are formatted consistently with `ApiResponse<T>` pattern

### 2. Auto Training Service (`useAutoTrainingBackend.ts`)

**Endpoints Used:**
```typescript
// Service Management
POST   /api/auto-training/start
POST   /api/auto-training/stop
GET    /api/auto-training/status
PUT    /api/auto-training/config

// Operations
POST   /api/auto-training/trigger
GET    /api/auto-training/report
GET    /api/auto-training/health

// Model Management
POST   /api/auto-training/model/save
POST   /api/auto-training/model/load

// Data Access
GET    /api/auto-training/data/historical
GET    /api/auto-training/data/timeseries/{itemId}
```

**Backend Integration:**
- All calls go through `AutoTrainingController.js`
- Controller uses `AutoTrainingService.js`
- Service orchestrates training through Python AI integration

### 3. MongoDB Service (`mongoService.ts`)

**Endpoints Used:**
```typescript
// Live Monitoring
GET    /api/live-monitoring
POST   /api/live-monitoring
SSE    /api/live-monitoring/stream

// Analytics
GET    /api/aggregated-stats
GET    /api/system-status
GET    /api/efficiency-metrics
GET    /api/health

// Data Management
POST   /api/cleanup
```

**Backend Integration:**
- Direct MongoDB access through `MonitoringService.js`
- Real-time updates via Server-Sent Events
- Fallback polling when SSE unavailable

### 4. External APIs (`api.ts`)

**OSRS Wiki API:**
```typescript
GET    https://prices.runescape.wiki/api/v1/osrs/latest
GET    https://prices.runescape.wiki/api/v1/osrs/latest?id={itemIds}
```

## React Hook Integration

### Updated Hooks

1. **`useAITradingBackend.ts`**
   - Uses environment-based API URL configuration
   - Maintains existing interface for components
   - Proper error handling and loading states

2. **`useAutoTrainingBackend.ts`**
   - Updated to use environment variables
   - Comprehensive auto-training service management
   - Real-time status monitoring

3. **MongoDB Integration Hooks**
   - Environment-based configuration
   - Server-Sent Events for real-time updates
   - Graceful fallback mechanisms

## TypeScript Types

### Enhanced Types for Python AI Integration

```typescript
// Extended AI trading types
export interface EnhancedTrainingMetrics extends TrainingMetrics {
  python_session_id?: string
  algorithm?: string
  timesteps_completed?: number
  model_version?: string
  training_time_ms?: number
}

export interface EnhancedModelPrediction extends ModelPrediction {
  python_model_id?: string
  processed_features?: number
  prediction_time_ms?: number
  action_name?: string
}

// Python AI specific types
export interface PythonAiPrediction {
  action: number
  action_name: string
  confidence: number
  expected_return?: number
  q_values?: number[]
  model_id: string
  prediction_time_ms: number
  processed_features: number
}
```

## Component Integration

### Main Application Flow

1. **App.tsx** - Tab-based navigation between dashboards
2. **AITradingDashboard** - Uses `useAITradingBackend` hook
3. **AutoTrainingDashboard** - Uses `useAutoTrainingBackend` hook
4. **LiveMonitoringDashboard** - Uses MongoDB service with SSE

### Real-time Updates

**Server-Sent Events (SSE):**
- Endpoint: `/api/live-monitoring/stream`
- Fallback: Polling every 30 seconds
- Automatic reconnection on connection loss

**WebSocket Support:**
- Available for future enhancements
- Currently not implemented but planned

## Error Handling

### Consistent Error Patterns

All API services use the standardized `ApiResponse<T>` pattern:

```typescript
interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  meta?: {
    timestamp: string
    requestId: string
  }
}
```

### Fallback Mechanisms

1. **Python AI Service Unavailable:**
   - Backend circuit breaker activates
   - Frontend shows appropriate error messages
   - Graceful degradation to basic functionality

2. **MongoDB Connection Issues:**
   - Fallback to mock data generation
   - User notification of reduced functionality
   - Automatic retry mechanisms

3. **External API Failures:**
   - Cached data used when available
   - Error notification to user
   - Retry with exponential backoff

## Testing Integration

### Frontend Integration Test

Run the integration test to verify all connections:

```bash
cd /home/oliver/apps/osrs-market
node frontend-integration-test.js
```

This test verifies:
- Backend health and connectivity
- AI trading system status
- Auto training service availability
- Market data system functionality
- Live monitoring capabilities
- External OSRS Wiki API access

### Manual Testing Steps

1. **Start Backend Services:**
   ```bash
   # Terminal 1: Start Python AI service
   cd /home/oliver/apps/osrs-market-ai
   python main.py
   
   # Terminal 2: Start Node.js backend
   cd /home/oliver/apps/osrs-market/server
   npm start
   
   # Terminal 3: Start React frontend
   cd /home/oliver/apps/osrs-market
   npm run dev
   ```

2. **Test Frontend Features:**
   - AI Trading tab - Create/manage sessions
   - Auto Training tab - Start/stop training
   - Live Monitoring tab - View real-time data
   - Manual Trading tab - Basic market data

## Performance Optimizations

### Caching Strategy

1. **Browser Caching:**
   - API responses cached for appropriate durations
   - Model predictions cached for 5 minutes
   - Market data cached for 30 seconds

2. **Backend Caching:**
   - Circuit breaker prevents cascade failures
   - Response caching in backend services
   - Database query optimization

### Real-time Performance

1. **Server-Sent Events:**
   - More efficient than polling
   - Automatic reconnection
   - Bandwidth optimization

2. **Component Optimization:**
   - React.memo for expensive components
   - useCallback for event handlers
   - Lazy loading for heavy components

## Troubleshooting

### Common Issues

1. **"Backend not responding":**
   - Check backend server is running on port 3001
   - Verify VITE_NODE_API_URL environment variable
   - Check CORS configuration

2. **"Python AI service unavailable":**
   - Ensure Python service is running on port 8000
   - Check backend logs for circuit breaker status
   - Verify Python service endpoints are responding

3. **"Real-time updates not working":**
   - Check Server-Sent Events connection
   - Verify browser security settings
   - Check network connectivity

### Debug Commands

```bash
# Check backend health
curl http://localhost:3001/api/ping

# Check AI trading status
curl http://localhost:3001/api/ai-trading/system-status

# Check Python AI service
curl http://localhost:8000/health/detailed

# Run integration test
node frontend-integration-test.js
```

## Future Enhancements

### Planned Improvements

1. **WebSocket Integration:**
   - Real-time training progress updates
   - Live trading decision streaming
   - Bi-directional communication

2. **Enhanced Error Recovery:**
   - Automatic service recovery
   - User-triggered retry mechanisms
   - Improved offline handling

3. **Performance Monitoring:**
   - Frontend performance metrics
   - API response time tracking
   - User experience analytics

---

**Last Updated**: January 2025  
**Integration Version**: 2.0.0 (Updated for Python AI Service Integration)