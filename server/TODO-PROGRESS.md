# **Backend To-Do List**

This checklist outlines the remaining tasks for the Node.js backend of the OSRS Flipping AI App, based on the provided project specifications.

# **Backend To-Do List: Further Enhancements**

This checklist outlines additional tasks for the Node.js backend of the OSRS Flipping AI App, building upon the completed "Blueprint Phase 1: Data Ingestion Pipeline Enhancements."

## **Blueprint Phase 2: Frontend Integration Dependencies**

This phase focuses on implementing backend API endpoints to support Phase 2 frontend dashboard enhancements.


## **Blueprint Phase 2: Core Data Processing & AI Orchestration**

This phase focuses on consolidating metric calculations, implementing the MarketPriceSnapshotModel, and setting up the Python AI microservice integration.


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