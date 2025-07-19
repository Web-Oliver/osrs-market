# OSRS Market AI - Integration Documentation

## Overview

This document describes the integration between the **osrs-market/server** (Node.js backend) and **osrs-market-ai** (Python AI microservice).

## Architecture

```
Frontend (React) - Port 3000
    ↓ HTTP API calls
Node.js Backend (Express) - Port 3001
    ↓ HTTP REST API calls
Python AI Service (FastAPI) - Port 8000
    ↓ Model operations & MongoDB
Database (MongoDB) - Port 27017
```

## Integration Points

### 1. HTTP API Communication

The Node.js backend communicates with the Python AI service through HTTP REST API calls using the `PythonRLClientService.js`.

**Base Configuration:**
- **Python Service URL**: `http://localhost:8000` (configurable via `PYTHON_RL_SERVICE_URL`)
- **Request Timeout**: 30 seconds
- **Retry Attempts**: 3 with exponential backoff
- **Circuit Breaker**: Opens after 5 consecutive failures

### 2. API Endpoints (Updated for v1)

#### Prediction Endpoints
- `POST /api/v1/predictions/predict` - Get trading predictions
- `POST /api/v1/predictions/predictions/batch` - Batch predictions
- `GET /api/v1/predictions/predictions/history` - Prediction history

#### Training Endpoints
- `POST /api/v1/training/train` - Train model with data
- `POST /api/v1/training/training/sessions` - Create training session
- `GET /api/v1/training/training/stats` - Get training statistics

#### Model Management Endpoints
- `POST /api/v1/models/save` - Save model to disk
- `POST /api/v1/models/load` - Load model from disk
- `GET /api/v1/models/models` - List available models
- `GET /api/v1/models/models/{model_id}` - Get specific model

#### Health & Monitoring
- `GET /health/detailed` - Detailed health check
- `GET /api/v1/models/models/stats` - Model statistics

### 3. Request/Response Formats

#### Prediction Request (New Format)
```javascript
{
  observation: [100, 200, 1500, 0.85, 25.5, 75, 0.12, 45.3, 15.2],
  item_id: 1234,
  feature_engineering: true,
  timestamp: 1642723200000
}
```

#### Prediction Response (New Format)
```javascript
{
  success: true,
  action: 0,
  action_name: "Hold",
  confidence: 0.95,
  expected_return: 12.5,
  q_values: [0.1, 0.9, 0.0],
  model_id: "osrs_rl_agent_v1",
  prediction_time_ms: 15.2,
  processed_features: 50,
  timestamp: 1642723200000
}
```

### 4. Database Integration

#### Node.js Backend (Primary Database Operations)
- **Connection**: `MONGODB_CONNECTION_STRING` (default: `mongodb://localhost:27017`)
- **Database**: `MONGODB_DATABASE` (default: `osrs_market_data`)
- **Collections**: 
  - `market_price_snapshots` - Time-series market data
  - `trade_outcomes` - Trading results
  - `ai_decisions` - AI trading decisions
  - `items` - Item master data

#### Python AI Service (Model Metadata)
- **Connection**: `DB_HOST:DB_PORT/DB_NAME` (default: `localhost:27017/osrs_market_data`)
- **Collections**:
  - Model metadata storage
  - Training session tracking
  - Performance metrics

### 5. Environment Variables

#### Node.js Service (.env)
```bash
# Database Configuration
MONGODB_CONNECTION_STRING=mongodb://localhost:27017
MONGODB_DATABASE=osrs_market_data

# Python AI Service
PYTHON_RL_SERVICE_URL=http://localhost:8000

# Application Configuration
NODE_ENV=development
PORT=3001
LOG_LEVEL=info
```

#### Python AI Service (.env)
```bash
# Database Configuration
DB_HOST=localhost
DB_PORT=27017
DB_NAME=osrs_market_data
DB_USERNAME=
DB_PASSWORD=

# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
API_VERSION=v1

# Cache Configuration
CACHE_ENABLED=true
CACHE_HOST=localhost
CACHE_PORT=6379

# Model Configuration
MODEL_SAVE_PATH=./models
DEFAULT_MODEL_ID=osrs_rl_agent_v1
```

## Data Flow

### 1. Market Data Collection
```
OSRS Wiki API → Node.js Backend → MongoDB (market_price_snapshots)
```

### 2. AI Prediction Flow
```
Node.js Backend → Python AI Service → Trained Model → Prediction Result → Node.js Backend
```

### 3. Training Flow
```
MongoDB (historical data) → Node.js Backend → Python AI Service → Model Training → Updated Model
```

## Circuit Breaker Pattern

The integration implements a circuit breaker pattern for resilience:

- **Closed State**: Normal operation, requests pass through
- **Open State**: After 5 consecutive failures, circuit opens for 60 seconds
- **Half-Open State**: After timeout, allows one request to test service

## Error Handling

### Retry Logic
- **Exponential Backoff**: 1s, 2s, 4s delays between retries
- **4xx Errors**: No retry (client errors)
- **5xx Errors**: Full retry with backoff

### Fallback Mechanisms
- Circuit breaker prevents cascade failures
- Graceful degradation when AI service unavailable
- Error logging with structured context

## Testing Integration

### Run Integration Test
```bash
cd /home/oliver/apps/osrs-market
node integration-test.js
```

### Manual Testing
1. Start Python AI service: `cd /home/oliver/apps/osrs-market-ai && python main.py`
2. Start Node.js backend: `cd /home/oliver/apps/osrs-market/server && npm start`
3. Test endpoints using the integration script

## Performance Considerations

### Caching Strategy
- **Prediction Caching**: Recent predictions cached for 5 minutes
- **Model Metadata**: Cached for 30 minutes
- **Health Checks**: Cached for 1 minute

### Connection Pooling
- **HTTP Client**: Persistent connections with keep-alive
- **MongoDB**: Connection pooling with max 100 connections
- **Redis**: Connection pooling for cache layer

## Monitoring & Observability

### Metrics Tracked
- Request/response times
- Success/failure rates
- Circuit breaker state
- Model performance metrics
- Database connection health

### Logging
- Structured JSON logging
- Request/response correlation IDs
- Error stack traces with context
- Performance timing information

## Security Considerations

### API Security
- Request timeout limits (30 seconds)
- Input validation on all endpoints
- Rate limiting (60 requests per minute)
- CORS configuration

### Data Security
- No sensitive data in logs
- Secure environment variable management
- Database connection encryption (if configured)

## Troubleshooting

### Common Issues

#### 1. "Circuit breaker is open"
- **Cause**: Python AI service is down or responding with errors
- **Solution**: Check Python service health, restart if needed

#### 2. "Connection timeout"
- **Cause**: Network issues or Python service overloaded
- **Solution**: Check network connectivity, increase timeout if needed

#### 3. "Invalid response format"
- **Cause**: API version mismatch between services
- **Solution**: Ensure both services use compatible API versions

#### 4. Database connection errors
- **Cause**: MongoDB not running or configuration issues
- **Solution**: Check MongoDB status and environment variables

### Debug Commands
```bash
# Check service health
curl http://localhost:8000/health/detailed

# Check circuit breaker status
node -e "
const { PythonRLClientService } = require('./server/services/PythonRLClientService');
const client = new PythonRLClientService();
console.log(client.getClientStats());
"

# Test database connection
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017/osrs_market_data');
mongoose.connection.on('connected', () => console.log('MongoDB connected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', err));
"
```

## Deployment Notes

### Development Environment
1. Start MongoDB: `mongod`
2. Start Python AI service: `cd osrs-market-ai && python main.py`
3. Start Node.js backend: `cd osrs-market/server && npm run dev`
4. Start React frontend: `cd osrs-market && npm start`

### Production Environment
- Use Docker Compose for orchestration
- Configure health checks and restart policies
- Set up monitoring and alerting
- Use production-grade MongoDB deployment
- Configure load balancing if needed

---

**Last Updated**: January 2025  
**Version**: 2.0.0 (Context7 Enhanced Integration)