# **Backend To-Do List**

This checklist outlines the remaining tasks for the Node.js backend of the OSRS Flipping AI App, based on the provided project specifications.

# **Backend To-Do List: Further Enhancements**

This checklist outlines additional tasks for the Node.js backend of the OSRS Flipping AI App, building upon the completed "Blueprint Phase 1: Data Ingestion Pipeline Enhancements."

## **Blueprint Phase 2: Frontend Integration Dependencies**

This phase focuses on implementing backend API endpoints to support Phase 2 frontend dashboard enhancements.

* [x] **Step 2.0: Context7 Documentation**
  * [x] **Use Context7 to get documentation for Node.js, Express, MongoDB, and Mongoose**
    * Retrieved comprehensive documentation for all required technologies
    * Documentation used to implement Phase 2 backend endpoints following Context7 patterns

* [x] **Step 2.1: Watchlist Backend API**
  * [x] **Implement backend API endpoints for watchlist management**
    * ✅ Watchlist system was already fully implemented in previous phases
    * ✅ WatchlistService.js and WatchlistController.js already exist
    * ✅ Routes for add, remove, fetch watchlist items already implemented
    * ✅ MongoDB persistence already working

* [x] **Step 2.2: Popular Items API**
  * [x] **Implement backend API endpoints for fetching popular/relevant items**
    * ✅ Added getPopularItems method to MarketDataController.js
    * ✅ Added getPopularItems method to MarketDataService.js
    * ✅ Uses SmartItemSelectorService to get high-value items
    * ✅ Added /api/market-data/popular-items route with proper validation
    * ✅ Includes caching and profitability scoring

* [x] **Step 2.3: Top Flips Leaderboard API**
  * [x] **Implement backend API endpoints for top flips leaderboard**
    * ✅ Added getTopFlips method to MarketDataController.js
    * ✅ Added getTopFlips method to MarketDataService.js
    * ✅ Implemented sophisticated profitability scoring algorithm
    * ✅ Added /api/market-data/top-flips route with proper validation
    * ✅ Profitability score: expectedProfitPerHour * 0.4 + marginPercent * 0.3 + volume * 0.2 + (100 - riskScore) * 0.1

* [x] **Step 2.4: Alerts API**
  * [x] **Implement backend API endpoints for alerts (margin spikes/dips)**
    * ✅ Added getAlerts method to MarketDataController.js
    * ✅ Added createAlert method to MarketDataController.js
    * ✅ Added deleteAlert method to MarketDataController.js
    * ✅ Added corresponding service methods in MarketDataService.js
    * ✅ Added /api/market-data/alerts routes (GET, POST, DELETE)
    * ✅ Supports price_above, price_below, and volume_spike alert types

* [x] **Step 2.5: Manual Test Mode API**
  * [x] **Implement backend API endpoint for AI manual test mode**
    * ✅ Added manualTest method to MarketDataController.js
    * ✅ Added getManualTestResults method to MarketDataController.js
    * ✅ Added processManualTest method to MarketDataService.js
    * ✅ Added getManualTestResults method to MarketDataService.js
    * ✅ Added /api/market-data/manual-test routes (POST for test, GET for results)
    * ✅ Includes profit/loss calculations and AI recommendation comparisons

* [x] **Step 2.6: Additional Supporting APIs**
  * [x] **Implement comprehensive backend API endpoints**
    * ✅ Added getAnalytics method for market analytics
    * ✅ Added getCategories method for item categorization
    * ✅ Added exportData method for data export functionality
    * ✅ Added compareItems method for item comparison
    * ✅ Added getPortfolioAnalysis method for portfolio analysis
    * ✅ Added validateData method for data validation
    * ✅ All methods include proper error handling and logging

## **Blueprint Phase 2: Core Data Processing & AI Orchestration**

This phase focuses on consolidating metric calculations, implementing the MarketPriceSnapshotModel, and setting up the Python AI microservice integration.

* \[x\] **Step 2.0: Implement GE Tax Constant**  
  * \[x\] **Define Global Constants**:  
    * ✅ Created utils/marketConstants.js with GE tax rate (2%) and threshold (1000 GP)  
    * ✅ Added comprehensive GE tax calculation functions  
    * ✅ Included helper functions for profit calculations after tax  
  * \[x\] **Integrate into Price Calculations**:  
    * ✅ Updated PriceCalculator.js to use GE tax calculations  
    * ✅ Modified MarketDataService.js saveMarketSnapshot to calculate GE tax  
    * ✅ Added GE tax fields to MarketPriceSnapshotModel  
    * ✅ Integrated tax-free logic for items under 1000 GP  
* \[x\] **Step 2.1: Implement MarketPriceSnapshotModel**  
  * \[x\] **Create src/models/MarketPriceSnapshotModel.ts**:  
    * ✅ MarketPriceSnapshotModel.js already exists with complete schema  
    * ✅ All core fields implemented: itemId, timestamp, highPrice, lowPrice, volume, interval  
    * ✅ All derived metrics included: marginGp, marginPercent, volatility, velocity, etc.  
    * ✅ Added GE tax fields: geTaxAmount, isTaxFree, netSellPrice, grossProfitGp, grossProfitPercent  
    * ✅ Compound indexes implemented for efficient time-series queries  
    * ✅ Instance methods for profit calculations with GE tax integration  
    * ✅ Static methods for common queries (getLatestSnapshot, etc.)  
    * ✅ Pre-save middleware for data validation  
* \[ \] **Step 2.2: Refactor Metric Calculation and Persistence**  
  * \[ \] **Consolidate Metric Calculations**:  
    * Create a new utility service, e.g., src/services/FinancialMetricsCalculator.ts, or designate PriceCalculator.js as the sole raw calculation utility.  
    * Move common raw calculation methods (e.g., calculateRSI, calculateVolatility, moving averages) from TradingAnalysisService.js to this consolidated utility.  
    * TradingAnalysisService.js should then focus purely on interpreting these metrics to generate higher-level market signals and flipping opportunities. This improves DRYness and reinforces SRP.  
  * \[ \] **Integrate Derived Metric Persistence**:  
    * **Modify src/services/MarketDataService.ts**:  
      * Update saveMarketSnapshot method to:  
        * Accept raw price/volume data (itemId, timestamp, highPrice, lowPrice, volume, interval).  
        * Before saving, call the consolidated metric calculation utility (e.g., PriceCalculator.js or FinancialMetricsCalculator.ts) to compute all derived metrics (marginGp, marginPercent, volatility, velocity, trendMovingAverage, rsi, macd, momentumScore, riskScore, expectedProfitPerHour, profitPerGeSlot).  
        * Explicitly incorporate the **2% rounded-down GE tax** into all profit calculations (marginGp, marginPercent, expectedProfitPerHour, profitPerGeSlot), applying it **only when the item's price is over 1000 GP**.  
        * Save the raw data **along with all computed derived metrics** to the MarketPriceSnapshotModel.  
* \[ \] **Step 2.3: Implement Python RL Microservice (Node.js Client)**  
  * \[ \] **Refactor src/services/NeuralTradingAgentService.ts**:  
    * Rename it or create a new service, e.g., src/services/PythonRLClientService.ts.  
    * This service will act as a thin HTTP client for the Python microservice.  
    * Implement methods for:  
      * predict(features: any\[\]): Promise\<any\>: Sends features to Python's /predict endpoint.  
      * train(data: any\[\]): Promise\<any\>: Sends training data to Python's /train endpoint.  
      * saveModel(modelId: string): Promise\<any\>: Calls Python's /save\_model endpoint.  
      * loadModel(modelId: string): Promise\<any\>: Calls Python's /load\_model endpoint.  
      * getTrainingStatus(): Promise\<any\>: Calls Python's /status endpoint.  
    * Implement robust error handling for HTTP requests (timeouts, retry mechanisms for transient errors).  
  * \[ \] **Update src/services/AITradingOrchestratorService.ts and src/services/AutoTrainingService.ts**:  
    * Modify these services to use the PythonRLClientService for all AI-related operations (training, prediction, model management) instead of direct local AI logic. This reinforces DIP.  
  * \[ \] **Implement AI Model Metadata Storage**:  
    * **Extend src/models/AIModelMetadata.ts (new schema)**:  
      * modelId: { type: String, required: true, unique: true }  
      * version: { type: String, required: true }  
      * trainingDate: { type: Date, required: true }  
      * performanceMetrics: { type: Object } (e.g., { roi: Number, accuracy: Number, totalProfit: Number })  
      * storagePath: { type: String, required: true } (local file path on the server)  
      * status: { type: String, enum: \['production', 'testing', 'archived'\], default: 'testing', required: true }  
    * \[ \] **Integrate with AITradingOrchestratorService.ts**:  
      * When a model is saved (via Python microservice), store its metadata in this new MongoDB collection.  
      * Implement logic to automatically load the model marked with status: 'production' for active use at startup or on demand.  
* \[ \] **Step 2.4: Backend Simulation Environment (Node.js Components for Orchestration)**  
  * \[ \] **Refactor AITradingOrchestratorService.js**:  
    * Ensure its role is primarily to orchestrate the simulation by interacting with the Python OpenAI Gym environment (via PythonRLClientService).  
    * It will prepare simulation data (historical market snapshots), send it to the Python service for a simulated run, and process the results.  
  * \[ \] **Implement Dual-Mode Strategy (Node.js Logic)**:  
    * Within AITradingOrchestratorService.js or a new CapitalAllocationService.ts:  
      * Develop algorithmic logic to dynamically allocate capital between "high-frequency, instant flips" and "patient, overnight offers."  
      * This logic will consider market conditions (e.g., volatility, liquidity, available margins) and desired engagement levels (e.g., user-defined risk tolerance).  
  * \[ \] **Implement Dynamic Risk Management (Node.js Logic)**:  
    * Within AITradingOrchestratorService.js or a RiskManagementService.ts:  
      * Integrate automated stop-loss mechanisms for individual positions.  
      * Develop a portfolio-level liquidity management system that continuously evaluates the opportunity cost of holding an item and reallocates capital to more promising ventures.  
* \[ \] **Step 2.5: Logging and Monitoring Enhancements (Backend)**  
  * \[ \] **Structured Logging**:  
    * Implement a robust logging library (e.g., Winston or Pino) across the backend.  
    * Ensure all log entries are structured (JSON format) and include: timestamp (Unix milliseconds), level ('info', 'warn', 'error', 'debug'), service (e.g., 'DataScraper', 'MarketAnalysis', 'AITraining'), message, and optionally itemId and traceId.  
  * \[ \] **WebSocket for Live Console Output**:  
    * Set up a WebSocket server in your Node.js backend (e.g., using ws or socket.io).  
    * Stream relevant backend logs (filtered by level, service, etc.) to connected frontend clients via this WebSocket. This will feed the "Live Console Output" in LiveMonitoringDashboard.tsx.

## **Blueprint Phase 3: Advanced Backend Services & Optimization**


This phase focuses on refining existing services and introducing more sophisticated features.

* \[ \] **Step 3.1: Implement Watchlist Persistence**  
  * \[ \] **Create src/models/WatchlistModel.ts**:  
    * Define Mongoose schema with fields:  
      * userId: { type: String, required: true, index: true } (placeholder, will be used post-authentication)  
      * itemId: { type: Number, ref: 'Item', required: true, index: true }  
      * addedDate: { type: Date, default: Date.now }  
      * currentPrice: { type: Number }  
      * currentMargin: { type: Number }  
    * Add a compound index on (userId, itemId) for uniqueness and efficient lookup.  
  * \[ \] **Create src/services/WatchlistService.ts**:  
    * Implement methods for:  
      * addItemToWatchlist(userId, itemId)  
      * removeItemFromWatchlist(userId, itemId)  
      * getWatchlist(userId)  
      * updateWatchlistMetrics() (a scheduled job to periodically update currentPrice and currentMargin for watchlist items from MarketPriceSnapshotModel).  
  * \[ \] **Integrate with src/routes/userRoutes.ts (or a new watchlistRoutes.ts)**:  
    * Add API endpoints for managing the watchlist (add, remove, get).  
* \[ \] **Step 3.2: Enhance Item Selection and Alerts**  
  * \[ \] **Refine SmartItemSelectorService.ts**:  
    * Modify getTopFlippingOpportunities to calculate a **"Profitability Score"** based on the weighted average of:  
      * Expected Profit per Hour (highest weight)  
      * Margin (%)  
      * Trade Volume (per day)  
      * Velocity (Time to Sell) (lower is better, so perhaps 1/Velocity or a similar inverse relationship)  
      * Risk Score (lower is better, so perhaps 1/RiskScore)  
    * Ensure this service can tag items with 'low risk', 'fast flip', 'volatile', etc., based on their calculated metrics and thresholds.  
  * \[ \] **Implement Alerting System**:  
    * **Create src/services/AlertingService.ts**:  
      * Implement logic to detect "large margin spikes or dips." This could involve:  
        * Monitoring MarketPriceSnapshotModel for significant percentage changes in margin or price over short timeframes (e.g., hourly, 5-minute intervals).  
        * Using statistical thresholds (e.g., price change exceeding 2-3 standard deviations from a moving average).  
        * Predefined percentage-based thresholds (e.g., \>10% margin change in 1 hour).  
      * Store triggered alerts in a new AlertModel (e.g., itemId, alertType, message, timestamp, severity).  
      * Expose an API endpoint to retrieve active alerts.  
* \[ \] **Step 3.3: Implement Manual Test Mode Backend Logic**  
  * \[ \] **Extend src/services/AITradingOrchestratorService.ts or create a new ManualTestService.ts**:  
    * Implement simulateManualFlip(itemId: number, goldAvailable: number, maxHoldingTime: number): Promise\<SimulationResult\>:  
      * This function will use historical data from MarketPriceSnapshotModel and the Python RL agent (via PythonRLClientService.ts) to simulate an optimal flip for the given itemId and goldAvailable within maxHoldingTime.  
      * The SimulationResult should include:  
        * estimatedProfitGp  
        * estimatedProfitPercent  
        * estimatedTimeToComplete  
        * riskAssessment  
        * suggestedBuyPrice  
        * suggestedSellPrice  
        * simulatedPricePath (optional, for detailed visualization)  
* \[ \] **Step 3.4: Backtesting and Reporting Infrastructure**  
  * \[ \] **Create src/services/BacktestingService.ts**:  
    * Implement runBacktest(strategy: string, startDate: Date, endDate: Date, initialCapital: number): Promise\<BacktestReport\>:  
      * This service will utilize the historical data from MarketPriceSnapshotModel and interact with the Python RL service to run a strategy simulation over a specified historical period.  
      * The BacktestReport should include metrics like: total profit, ROI, maximum drawdown, win rate, average trade duration, etc.  
  * \[ \] **Integrate External Catalysts (Long-Term Investing)**:  
    * This is a more advanced step, but begin by exploring options for:  
      * **News Scraping**: Identify relevant OSRS news sources (official announcements, community forums, Reddit).  
      * **NLP Integration**: If needed, consider another Python microservice for NLP processing to identify keywords and sentiment related to game updates or balance changes that may impact item values.  
      * **Data Storage**: Store extracted news/sentiment data (e.g., NewsModel with title, content, sentimentScore, relevantItems, timestamp).  
* \[ \] **Step 3.5: API Documentation & Schema Enforcement**  
  * \[ \] **Implement OpenAPI/Swagger**:  
    * Integrate a tool like swagger-jsdoc and swagger-ui-express to automatically generate API documentation from your JSDoc comments. This helps both frontend and future developers understand and consume your API easily.  
  * \[ \] **Joi/Yup for Request Validation**:  
    * Implement schema validation for all incoming API requests (e.g., using Joi or Yup) to ensure data integrity and prevent common security vulnerabilities.