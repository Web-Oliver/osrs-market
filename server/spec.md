# **OSRS Flipping AI App \- Comprehensive Specification**

## **Overview**

This document outlines the comprehensive specification for a full-stack intelligent platform designed to analyze the Old School RuneScape (OSRS) Grand Exchange (GE) market. The backend is largely developed in Node.js, with a strong emphasis on modularity, robust data handling, and microservice-oriented design, adhering to **DRY (Don't Repeat Yourself)** and **SOLID principles** to ensure maintainability, scalability, and extensibility. The core AI training and simulation will be implemented in Python for optimal performance and leverage of specialized libraries. The frontend is being built with React, TypeScript, and Tailwind CSS, providing real-time dashboards for monitoring and control.

The platform will:

* Scrape and consume live and historical OSRS Grand Exchange (GE) data.  
* Analyze market behavior in real-time, focusing on **consistent metrics derived from a unified dataset**, promoting **DRY** by avoiding redundant data sources or calculations.  
* Automatically train an AI agent to discover and optimize item flipping strategies for in-game profit (GP).  
* Visualize AI decisions, outcomes, and market trends through a real-time dashboard, presenting **reports based on the most important metrics over time**.

## **🌟 Project Goals**

The primary goals of this project are:

* **Data Acquisition:** Scrape and sync item pricing and volume data from OSRS APIs and specific item pages, ensuring **all information is saved in the database** for consistent analysis. This emphasizes a **Single Source of Truth** (DRY).  
* **Market Analysis:** Track and rank items based on flipability, ROI, risk, and speed, using **unified data from the database**. Calculations for these metrics will adhere to **Single Responsibility Principle (SRP)**, with dedicated services for specific analytical tasks.  
* **AI Training:** Train AI agents (Reinforcement Learning and Machine Learning) to optimize flipping decisions. The AI module will be **Open for Extension, Closed for Modification (OCP)**, allowing new algorithms to be added without altering core orchestration logic.  
* **Visualization:** Visualize item data, successful flips, market trends, and AI behavior in a user-friendly dashboard, with **reports based on consistent, time-series metrics**.

## **🚀 Current Workflow & Git Structure**

* **Backend GIT:** git add, git commit, git push on refactoring branch.  
* **Frontend GIT:** Same Git flow under refactoring branch.

**Claude AI Notes:**

* **Frontend:** Proceed with development  
* **Backend:** Must fix all existing tests before proceeding further

## **📂 Data Sources**

### **Item Discovery & Initial Data Ingestion (via HTML Scraping)**

The following OSRS Grand Exchange "Top 100" pages are used as a mechanism for **discovering and initially ingesting items** into our comprehensive database. The data from these pages, while scraped, will be processed and integrated into our unified time-series market data model, rather than being treated as separate, distinct lists for reporting purposes.

* **🔺 Top 100 Price Rises:** [https://secure.runescape.com/m=itemdb](https://secure.runescape.com/m=itemdb)\_oldschool/top100?list=2  
* **🔻 Top 100 Price Falls:** [https://secure.runescape.com/m=itemdb](https://secure.runescape.com/m=itemdb)\_oldschool/top100?list=3  
* **💰 Top 100 Most Valuable Items (High Prices):** [https://secure.runescape.com/m=itemdb](https://secure.runescape.com/m=itemdb)\_oldschool/top100?list=1  
* **🔁 Top 100 Most Traded Items:** [https://secure.runescape.com/m=itemdb](https://secure.runescape.com/m=itemdb)\_oldschool/top100?list=0\&scale=0

Scale Parameter:  
The \&scale= parameter determines the timeline for these lists:

* \&scale=0: Last 7 days  
* \&scale=1: Last month  
* \&scale=2: Last 3 months  
* \&scale=3: Last 6 months

**Current Status & Needs:**

* **Good:** The OSRSDataScraperService is robustly implemented with Puppeteer and Cheerio, capable of targeting these categories and performing pattern detection. It includes respectful scraping practices (delays, user-agent) and integrates with the MongoDB persistence. It adheres to **SRP** by focusing solely on scraping logic.  
* **Needs Improvement:** The current implementation of OSRSDataScraperService and OSRSScraperController needs to be enhanced to explicitly utilize **only the \&scale=3 (Last 6 months) parameter value** when fetching these "Top 100" lists for initial item discovery. This will ensure a comprehensive historical record for item discovery and initial data ingestion. The scraper will use **Playwright** to identify and click item elements on these pages to navigate to their individual item pages. These "Top 100" lists will be scraped approximately **once every 24 hours**, specifically to identify **newly found items not yet scraped** for their 6-month history from that specific API.

### **Individual Item Page Historical Data (Targeted Scraping)**

When an item is identified from the "Top 100" lists, the system will perform a **targeted scrape for detailed historical data** from its dedicated Grand Exchange page. **This data will then be saved into the unified database.**

* **Flow:**  
  1. **Navigation:** The system will simulate a click on the item from the "Top 100" list to navigate directly to its specific item page (e.g., https://secure.runescape.com/m=itemdb\_oldschool/Abyssal+whip/viewitem?obj=4151). Playwright will be used to identify the correct HTML elements for clicking.  
  2. **Data Extraction:** Extract **Price Daily Average** and **Amount Traded** data points from the price graph(s) on this page, specifically targeting data for the **last 6 months**. The "Trend" from these graphs may also be considered for import.  
  3. **Data Persistence:** This extracted data will be saved into the MarketPriceSnapshotModel.  
* **Optimization & Deduplication (Crucial for Efficiency and Data Consistency):**  
  * This targeted scraping should **only occur** if the detailed historical data for the last 6 months for that specific item is **NOT already present** in the database. A separate flag (e.g., in a dedicated collection or as a field in ItemModel referencing the itemId) will track whether an item's 6-month history has been scraped. This promotes **DRY** by preventing redundant data collection.  
  * Once an item's 6-month history has been scraped, it will be continuously considered by the AI models, providing more data for training.  
  * If a targeted scrape fails, the item should be "saved for later" for a retry, though the specific retry mechanism is a lower priority for now.  
  * All identified items from the "Top 100" lists will be scraped for 6-month historical data using a **proper queue system**. No specific prioritization among these items is required. The specific type of queue system and maximum concurrency are to be determined by the developer for optimal performance. This adheres to **SRP** for managing scrape tasks.  
  * The goal is to **make fewer useless calls** and **continuously build our data sample size** for better optimized analysis, ensuring **all information is saved in the database** and is **consistent**.  
* **Current Status & Needs:**  
  * **Needs Implementation:** This is a new data collection strategy that needs to be designed and implemented.  
  * **Recommendation:** Integrate this targeted scraping logic into OSRSDataScraperService.js, with triggers originating from DataCollectionService.js or MarketDataService.js when interesting patterns are detected. Implement robust deduplication logic to prevent redundant scrapes and ensure data consistency in the database.

### **RuneLite Real-Time Price API**

Access real-time Grand Exchange price data from the official API. **All data fetched will be saved into the database for consistent analysis.**

* **Base URL:** [https://prices.runescape.wiki/api/v1/osrs](https://prices.runescape.wiki/api/v1/osrs)

**Endpoints:**

* /latest: Get the latest high and low prices for all items with available data, along with the Unix timestamp of the transaction. This endpoint should be polled when a **specific button is clicked** in the frontend.  
* /5m: Provides 5-minute averages of item high and low prices, as well as the number traded. Includes a Unix timestamp indicating the beginning of the 5-minute block. This endpoint should be polled **every 5 minutes**.  
* /1h: Provides hourly averages of item high and low prices, and the number traded. This endpoint should be polled **every hour**.  
* /mapping: Provides a list of objects containing metadata about items (name, ID, examine text, members status, low alch value, high alch value, GE limit, icon file name).

**Current Status & Needs:**

* **Good:** The OSRSWikiService is a near-perfect implementation of external API integration. It handles all specified endpoints, incorporates advanced caching, robust global and *per-item* rate limiting, and a circuit breaker pattern for resilience. It correctly sets a descriptive User-Agent (OSRS-Market-Tracker/1.0 (Educational AI Trading Research; Contact: [github.com/your-repo/issues](https://www.google.com/search?q=https://github.com/your-repo/issues))), adhering to the API's acceptable use policy. This service exemplifies **SRP** by focusing solely on RuneLite API interaction.  
* **Needs Improvement:** None for its core functionality.

## **💾 Data Models & Persistence**

### **Item Metadata Model (ItemModel.js)**

* **Current Status & Needs:**  
  * **Good:** The ItemModel.js is a well-defined Mongoose schema for static item metadata. It includes comprehensive fields, validation, virtual properties for derived attributes, static methods for common queries, and error handling middleware. It's optimized with appropriate indexes. This model adheres to **SRP** by managing only static item metadata.  
  * **Needs Improvement:** None for its intended purpose.

### **Dynamic Market Data Model (MarketPriceSnapshotModel)**

* **Current Status & Needs:**  
  * **Needs Creation:** While mongoDataPersistence.js includes a marketDataCollection, a dedicated Mongoose schema for the dynamic, time-series market data (including all calculated metrics) is not explicitly defined in the provided files.  
  * **Recommendation:** Create a new Mongoose schema (e.g., MarketPriceSnapshotModel.js) to serve as the **single, consistent source of truth** for all time-series market data. This model should include:  
    * itemId: (references ItemModel)  
    * timestamp: (Unix timestamp in milliseconds of the data point)  
    * highPrice, lowPrice, volume  
    * interval: (e.g., 'daily\_scrape', '5m', '1h', '6m\_scrape' \- to distinguish data granularity from different sources)  
    * **All Derived Metrics:** marginGp, marginPercent, volatility, velocity, trendMovingAverage (e.g., SMA, EMA), rsi, macd, momentumScore, riskScore, expectedProfitPerHour, profitPerGeSlot, and any other relevant metrics calculated by PriceCalculator.js and TradingAnalysisService.js. These metrics should be calculated and stored immediately after new raw price data is ingested. This model adheres to **SRP** by managing only dynamic market data and derived metrics, and promotes **DRY** by centralizing all time-series market data.  
  * **Impact:** This is crucial for providing the rich, historical feature set needed for robust AI training and comprehensive dashboard visualizations, ensuring **data consistency across all reports and analyses**. DataCollectionService and MarketDataService will need to be updated to explicitly save and query from this new model. Data from different granularities (daily averages from 6-month scrapes, 5-minute averages, 1-hour averages) will be continuously added and integrated into this single model.

### **MongoDB Persistence Layer (mongoDataPersistence.js)**

* **Current Status & Needs:**  
  * **Good:** This is an exceptionally robust and production-ready MongoDB persistence layer. It features optimized connection pooling, comprehensive timeout configurations, reliability settings (retryWrites, writeConcern), modern features (Server API Version, compression), clear collection separation, and efficient indexing strategies. It also includes health checks and data cleanup mechanisms. This layer adheres to **SRP** by focusing solely on database interaction, and supports **Dependency Inversion Principle (DIP)** by providing an abstraction over the database.  
  * **Needs Improvement:** None for its core functionality. It is designed to support the new MarketPriceSnapshotModel.

## **📊 Core Flipping Metrics & Analysis**

These are the most critical values your app should calculate or track for each item, derived from the **consistent data saved in the database**:

* Buy Price, Sell Price, Margin (GP), Margin (%), Trade Volume (per day), Limit (per 4h), High Alch Value, Price Stability/Volatility, Time to Sell (Velocity).

### **Heuristics for Item Selection**

* High Margin \+ High Volume → Ideal flip (fast profit)  
* High Margin \+ Low Volume → Risky (might not sell fast)  
* Low Margin \+ High Volume → Small but consistent profits (great for bots or beginners)  
* Low Volatility \+ Stable Trend → Safer flips  
* Sudden Margin Spike → Might indicate a crash or manipulation

### **Advanced Calculated Metrics**

* Expected Profit per Hour, Risk Score, Profit per Slot.

### **Trend-Based Analysis**

* Moving Average (Price), Recent Margin Change (%), RSI (Relative Strength Index), Momentum Score, Seasonal trends (time-of-day/week patterns).

**Current Status & Needs:**

* **Good:** The PriceCalculator.js, TradingAnalysisService.js, MetricsCalculator.js, and SmartItemSelectorService.js collectively provide comprehensive capabilities for calculating all "Core Flipping Metrics," "Advanced Calculated Metrics," and "Trend-Based Analysis" as specified. They include various technical indicators, generate recommendations, and offer smart item selection heuristics.  
* **Needs Improvement:**  
  * **Metric Consolidation:** There is some functional overlap in raw calculation methods between PriceCalculator.js and TradingAnalysisService.js (e.g., calculateRSI, calculateVolatility).  
    * **Recommendation:** Consolidate raw calculation methods into a core utility (like PriceCalculator.js or a new FinancialMetricsCalculator) and have TradingAnalysisService.js focus purely on *interpreting* these metrics to generate higher-level market signals and flipping opportunities. This improves **DRYness** and reinforces **SRP** by ensuring each module has a single, well-defined responsibility.  
  * **Persistence of Derived Metrics:** Ensure all these calculated metrics are consistently applied and stored within the new MarketPriceSnapshotModel (as discussed above) by DataCollectionService and MarketDataService. This avoids recalculation on every read and provides rich features for the AI and dashboard, ensuring **reports are based on the most important metrics over time**.

## **🧠 AI Modeling & Training**

### **AI Training Strategies**

* **Supervised Learning:** Predict Price or Margin.  
* **Unsupervised Learning:** Cluster Items.  
* **Reinforcement Learning (Main Strategy):** Train an agent to make buy/sell decisions to maximize profit over time.  
* **Anomaly Detection:** Spot unusual or suspicious price movements.

**Current Status & Needs:**

* **Good:** The Node.js backend is exceptionally well-prepared to *orchestrate* AI training. AITradingOrchestratorService.js and AutoTrainingService.js provide robust session management, adaptive learning mechanisms, and the logic for finding trading opportunities and extracting features. TradeOutcomeTrackerService.js is excellent for evaluating AI performance. The TypeScript interfaces (aiTrading.ts, autoTraining.ts, trading.ts) are well-defined for AI-related data structures. These services demonstrate **SRP** (orchestration vs. outcome tracking) and **Interface Segregation Principle (ISP)** through clear TypeScript interfaces.  
* **Needs Improvement (Core AI Implementation \- Python):** The core Reinforcement Learning (RL) training and simulation components will be implemented in Python. This separation of concerns (Node.js for orchestration, Python for core AI) exemplifies a **Hierarchical Architecture** and **DIP**.  
  * **Recommendation:**  
    * **Python Microservice:** Develop a separate Python application (e.g., using FastAPI or Flask) that exposes a **REST API**. This service will host your custom OpenAI Gym environment and Stable-Baselines3 RL agents. Anticipated API endpoints include:  
      * /predict: For the AI agent to make a trading decision.  
      * /train: To initiate or continue training a model.  
      * /save\_model: To persist the trained model.  
      * /load\_model: To load a previously saved model.  
      * /status: To get the current status of the training process.  
    * **Python OpenAI Gym Environment:** Create a Python module (osrs\_ge\_env.py) defining a custom gym.Env class. This environment will simulate the OSRS Grand Exchange using historical market data (from your MongoDB) and handle the core simulation logic (price changes, GE limits, trade delays, reward calculation). This adheres to **SRP** for simulation logic.  
    * **Python RL Agent Implementation:** Implement your RL agents (DQN, PPO, SAC) using Stable-Baselines3 within Python (rl\_agent.py), interacting with osrs\_ge\_env.py. This component will be **Open for Extension (OCP)** to allow new RL algorithms.  
    * **Node.js Refactoring:** Refactor NeuralTradingAgentService.js to become a **thin client** that communicates with this Python RL microservice via HTTP requests for predict, trainOnBatch, saveModel, loadModel, etc. This reinforces **DIP** by depending on the Python abstraction.  
    * **Node.js Orchestration:** AITradingOrchestratorService.js and AutoTrainingService.js will serve as the "control plane," sending commands and data to the Python microservice and receiving results/metrics.  
    * **AI Model Storage**: AI model files will be stored **on the local PC** where the application is running. MongoDB will store metadata about each model, including fields like modelId, version, trainingDate, performanceMetrics, storagePath (local file path), and a status field (e.g., 'production', 'testing', 'archived'). The system will automatically load the model marked with status: 'production' for active use. This adheres to **SRP** for model metadata management.  
* **Backend Simulation Environment:**  
  * **Current Status & Needs:**  
    * **Good:** The Node.js AITradingOrchestratorService.js already contains logic for simulating trade execution, success, and price movements.  
  * **Needs Improvement (Python Transition):** As per the spec.md and our decision, this will be a **Python-based OpenAI Gym-style simulator**.  
    * **Recommendation:** Transition the detailed simulation logic (price movements, GE limits, order queues, reward calculation) to the Python-based OpenAI Gym environment. This reinforces **SRP** for simulation and **DIP** by abstracting the simulation environment.

## **📊 Real-Time Dashboard Overview (Frontend)**

The frontend features a comprehensive real-time dashboard to monitor market activity and AI performance. **All reports and visualizations will be based on the consistent, unified data stored in the database.** This promotes **DRY** by ensuring a single source of truth for displayed data.

### **Key Modules:**

* **🧠 AI Training Stats:** Current training cycle, profit generated, ROI/hour, successful vs. failed flips, loss curve / reward history, model version.  
* **📦 Market Activity:** Live high/low prices, Margin % leaderboard, Spike alerts, Trade volume changes, Item clustering by risk class, Historical price charts.  
* **📉 Bad Flip Detection:** Items flagged by AI due to low ROI, long holding time, frequent price crashes.  
* **💡 Recommended Items (from AI):** Real-time top 5 items by raw GP margin, ROI/hour, velocity, with status tags.  
* **⚖️ Manual Test Mode:** User inputs gold & item ID, AI simulates optimal flip, shows potential ROI and time estimate.

**Current Status & Needs (Frontend Components):**

1. **AITradingDashboard.tsx**:  
   * **Good:** Implements core AI training controls (start, stop, pause, resume), auto-trade toggle, current session info, performance metrics, recent AI decisions, adaptive learning settings, and model management. Uses custom hooks (useAITrading, useItemPrices) for data interaction.  
   * **Needs Improvement:**  
     * **Alerts:** Uses alert() for model save/load success, which should be replaced with a custom, non-blocking modal or notification message for a better user experience.  
     * **Charting:** The "Training Progress" section currently shows epsilon decay and portfolio value as static numbers. This should be enhanced with actual line charts (using **Recharts**) to visualize learning curves (loss, reward over time, epsilon decay, portfolio value trend) as implied by the spec. The X-axis for these charts will represent Time (Timestamp), and the Y-axis will represent the respective value.  
2. **LiveMonitoringDashboard.tsx**:  
   * **Good:** Very comprehensive monitoring dashboard. Displays key system metrics (API requests/min, success rate, items processed, response time) with status indicators. Features live charts for API requests over time and performance metrics (success rate & response time) using recharts. Includes detailed "Real-time Activity Feed" with filtering and export functionality. Presents a "Live Console Output" section. Uses lucide-react for icons and is well-styled with Tailwind CSS. Implements real-time updates via mongoService.startRealTimeUpdates (presumably an API client for the Node.js backend).  
   * **Needs Improvement:**  
     * **Live Console Output:** The "Live Console Output" is currently mocked with static div elements. This needs to be dynamically hooked up to actual backend logs streamed from the Node.js API via **WebSockets**. Each log entry should include: timestamp (Unix milliseconds), level (e.g., 'info', 'warn', 'error', 'debug'), service (e.g., 'DataScraper', 'MarketAnalysis', 'AITraining'), message (the log content), and optionally itemId (if the log is item-specific) and traceId (for request tracing). This adheres to **SRP** for the log display component.  
     * **mongoService Abstraction:** Ensure that mongoService in the frontend is a well-defined API client that communicates with your Node.js backend, rather than attempting a direct MongoDB connection from the browser (which is not feasible/secure). This is likely already the case given the backend structure, supporting **DIP**.  
3. **AutoTrainingDashboard.tsx**:  
   * **Good:** Provides clear controls for automated training (start, stop, manual cycle, configuration, export report, save/load model). Displays system status for data collection, training session details, and overall performance metrics. Includes an "Advanced Configuration" panel for detailed settings.  
   * **Needs Improvement:**  
     * **Alerts:** Similar to AITradingDashboard.tsx, it uses alert() for model load success, which should be replaced with a custom UI notification.  
     * **Charting:** The "Recent Training Metrics" are displayed in a table. While useful, adding charts for training progress (loss, reward over time, epsilon decay) would significantly enhance the visualization of the learning process, aligning with the "Agent learning curves" requirement.  
4. **TradingDashboard.tsx**:  
   * **Good:** This is a central dashboard for market analysis and flipping opportunities. It fetches data using useItemPrices and useMarketAnalysis hooks. It displays total opportunities, risk-categorized counts (Low, Medium, High), and a "Top Opportunities" section. It includes risk filtering controls and an "All Opportunities" section, rendering FlippingOpportunityCard components. It also has a watchlist feature. The loading and error states are handled gracefully.  
   * **Needs Improvement:**  
     * **Watchlist Persistence:** The watchlist is currently managed in local state (useState).  
       * **Recommendation:** Implement persistence for the watchlist by saving it to your **MongoDB backend**, associated with a user ID (once user authentication is implemented). The proposed schema for a watchlist item includes: userId (once implemented), itemId, addedDate, currentPrice, and currentMargin. This adheres to **SRP** for watchlist management.  
     * **"Top Flips Right Now" Leaderboard:** The "Top Opportunities" section is a good start, but ensure it explicitly aligns with the "Top 5 profitable items currently" and "Item tags: 'low risk', 'fast flip', 'volatile', etc." from the spec.md. The system will determine "most likely to be profitable" by calculating a composite "Profitability Score" based on a weighted average of: **Expected Profit per Hour (highest weight)**, **Margin (%)**, **Trade Volume (per day)**, **Velocity (Time to Sell)** (lower is better), and **Risk Score** (lower is better).  
     * **Alerts Integration:** Integrate a mechanism to display "Alerts for large margin spikes or dips" directly on this dashboard.  
5. **FlippingOpportunityCard.tsx**:  
   * **Good:** A well-designed component for displaying individual flipping opportunities. It clearly presents item name, ID, risk level, buy/sell prices, profit, ROI, time to flip, and spread. The color-coding for risk and ROI is effective. It includes an "Add to Watchlist" button. This component adheres to **SRP** by focusing on displaying a single opportunity.  
   * **Needs Improvement:** None for its current design.  
6. **ItemCard.tsx**:  
   * **Good:** A simple component for displaying basic item price information.  
   * **Needs Improvement:** This component appears somewhat basic compared to the richness of FlippingOpportunityCard.tsx. It might be a remnant or used for a different, simpler view.  
     * **Recommendation:** Evaluate if this component is still necessary or if FlippingOpportunityCard.tsx (or a more generalized version of it) can cover all item display needs. This evaluation promotes **DRY** by avoiding redundant components.  
7. **Frontend Custom Hooks (useAITrading.ts, useAITradingBackend.ts, useAutoTraining.ts, useAutoTrainingBackend.ts, useItemPrices.ts, useMarketAnalysis.ts)**:  
   * **Good:** Excellent use of custom React hooks to encapsulate stateful logic, API interactions, and business logic for different parts of the application. This promotes reusability, testability, and separation of concerns. The \_Backend hooks are well-designed for communicating with your Node.js API. useItemPrices correctly fetches real price data. useMarketAnalysis correctly uses generateTradingSignals from the backend. This structure aligns with **SRP** (each hook has a single responsibility) and **DIP** (hooks depend on abstractions for backend communication).  
   * **Needs Improvement:**  
     * **useItemPrices.ts \- Popular Items:** Currently, useItemPrices hardcodes a small list of "popular items."  
       * **Recommendation:** This should be replaced with a dynamic mechanism to fetch a broader range of items, perhaps based on the "Most Traded" list from your backend, or a "smart selection" of items from your SmartItemSelectorService. This will provide more relevant data for analysis.  
     * **Error Handling:** While errors are caught and set in state, the UI display for these errors could be more prominent and user-friendly (e.g., using a dedicated error banner component instead of just console.error or setError which might not always be visible to the user).  
8. **Frontend Type Definitions (aiTrading.ts, autoTraining.ts, index.ts, trading.ts)**:  
   * **Good:** Excellent use of TypeScript interfaces to define the structure of data exchanged between the frontend and backend. This provides strong type safety, improves developer experience, and ensures consistency. This aligns with **ISP** by providing specific interfaces for different data structures.  
   * **Needs Improvement:** None.  
9. **Frontend Utility (formatters.ts)**:  
   * **Good:** Provides essential utility functions for consistent formatting of prices, percentages, and timestamps across the UI. This promotes **DRY** by centralizing formatting logic.  
   * **Needs Improvement:** None.  
10. **Frontend Styling (App.css)**:  
    * **Good:** Provides basic root styling. The primary styling is clearly handled by Tailwind CSS classes directly within the components, which aligns with the chosen tech stack.  
    * **Needs Improvement:** None.

## **🚀 Next Milestones**

* **Phase 1: Backend Completion & Python Integration (Current Focus)**  
  * ✅ Scrape /latest, /5m, and /mapping data (Node.js).  
  * ✅ Implement comprehensive Node.js backend services (data collection, market analysis, monitoring, security, API routing). This will follow a **Hierarchical Architecture**, with clear separation of concerns and dependencies.  
  * ✅ Implement robust MongoDB persistence layer.  
  * **🚧 Create MarketPriceSnapshotModel.js** for dynamic, time-series market data with all derived metrics, serving as the **single, consistent source of truth (DRY)**.  
  * **🚧 Enhance OSRSDataScraperService.js** to fully utilize the \&scale=3 parameter for historical "Top 100" lists for item discovery and initial data ingestion, using **Playwright** for navigation and element interaction. This scrape will occur approximately once every 24 hours for newly found items.  
  * **🚧 Implement Targeted Item Page Historical Data Scraping:** Design and implement logic to scrape 6-month historical **Price Daily Average** and **Amount Traded** data from individual item pages when interesting patterns are detected, ensuring **deduplication** (using a flag for 6-month history) and **persistence into the unified database via a proper queue system**. This component will adhere to **SRP** for its scraping task.  
  * **🚧 Develop Python RL Microservice:**  
    * Build **Python-based OpenAI Gym environment** for OSRS GE simulation.  
    * Implement **Python RL agents** (DQN, PPO, SAC) using Stable-Baselines3. This module will be **Open for Extension (OCP)**.  
    * Expose a **REST API** from the Python microservice for training, prediction, and status updates (e.g., /predict, /train, /save\_model, /load\_model, /status).  
  * **🚧 Refactor Node.js AI Services:** Update NeuralTradingAgentService.js, AITradingOrchestratorService.js, and AutoTrainingService.js to communicate with the Python RL microservice. This refactoring will reinforce **Dependency Inversion Principle (DIP)**.  
  * **🚧 Sync AI outcomes** (profit, decisions, etc.) from Python to MongoDB (via Node.js).  
* **Phase 2: Frontend Dashboard Enhancements & Completion**  
  * **🚧 Replace alert() calls** in AITradingDashboard.tsx and AutoTrainingDashboard.tsx with custom **persistent toast** notification components. These toasts should appear at a consistent location (e.g., top-right), have distinct styling for success, error, warning, and info messages, and be dismissible by a close button or clicking on the toast.  
  * **🚧 Implement full charting** for AI training progress (loss, reward, epsilon, portfolio value over time) in AITradingDashboard.tsx and AutoTrainingDashboard.tsx using **Recharts**.  
  * **🚧 Hook up "Live Console Output"** in LiveMonitoringDashboard.tsx to actual backend log streams via **WebSockets**.  
  * **🚧 Implement persistence for Watchlist** in TradingDashboard.tsx to **MongoDB**.  
  * **🚧 Enhance useItemPrices.ts** to dynamically fetch a broader range of relevant items (e.g., from "Most Traded" or smart selection) from the unified database. This promotes **DRY** by avoiding hardcoded lists.  
  * **🚧 Implement "Top Flips Right Now" Leaderboard** and **"Alerts for large margin spikes or dips"** on the TradingDashboard.tsx, derived from the unified database. The "Top Flips" will be based on a composite "Profitability Score" (weighted average of Expected Profit per Hour, Margin %, Trade Volume, Velocity, Risk Score). Alerts will be triggered by statistical/percentage-based thresholds (e.g., price change exceeding 2-3 standard deviations, or \>10% margin change in 1 hour).  
  * **🚧 Implement "Manual Test Mode"** for AI suggestions, taking gold, item ID, and Max Holding Time as inputs, and providing estimated profit, estimated time to complete flip, risk assessment, and suggested buy/sell prices.  
  * **🚧 Evaluate if ItemCard.tsx is still necessary** or can be consolidated. This evaluation promotes **DRY** and better **SRP** for components.  
* **Phase 3: Evaluation & Refinement**  
  * **🚧 Evaluate training** using 30 days of replayed market data.  
  * **🚧 Implement advanced alert configurations** for margin spikes/dips.