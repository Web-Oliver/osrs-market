# **Backend To-Do List**

This checklist outlines the remaining tasks for the Node.js backend of the OSRS Flipping AI App, based on the provided project specifications.

## **Blueprint Phase 0: Core Infrastructure Completion**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION NODE EXPRESS MONGODB MONGOOSE  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] Ensure all existing tests are fixed before proceeding further.  
  \[ \]  
* \[ \] **Update todo-progress.md**: Mark all completed steps in "Blueprint Phase 0: Core Infrastructure Completion" as done.

## **Blueprint Phase 1: Data Ingestion Pipeline Enhancements**

### **Step 1.1: Enhance OSRSDataScraperService for Top 100 Discovery (Playwright)**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION NODE EXPRESS MONGODB MONGOOSE Playwright  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] Install playwright and its browser drivers.  
* \[ \] Modify src/services/OSRSDataScraperService.ts:  
  * \[ \] **Refactor scrapeTop100List**:  
    * \[ \] Use Playwright instead of Puppeteer/Cheerio.  
    * \[ \] Navigate to https://secure.runescape.com/m=itemdb\_oldschool/top100?list=${listType}\&scale=${scale}.  
    * \[ \] Use Playwright selectors to extract itemId and name.  
    * \[ \] Implement respectful scraping practices (page.waitForTimeout, User-Agent).  
    * \[ \] Return Array\<{itemId: number, name: string}\>.  
  * \[ \] **Modify getTop100ItemsForDiscovery()**:  
    * \[ \] Call refactored scrapeTop100List for all four listType values (0, 1, 2, 3\) but **strictly only with scale=3**.  
    * \[ \] Consolidate results, ensuring unique items by itemId.  
* \[ \] **Integration:**  
  * \[ \] Ensure OSRSDataScraperService is updated to use Playwright.  
  * \[ \] DataCollectionService.discoverAndStoreNewItems() should continue to call OSRSDataScraperService.getTop100ItemsForDiscovery().  
    \[ \]  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 1.2: Implement ScrapeQueueModel & Queueing Logic**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION NODE EXPRESS MONGODB MONGOOSE Queueing Logic  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] **Create src/models/ScrapeQueueModel.ts**:  
  * \[ \] Define Mongoose schema with fields: itemId (Number, required, unique, indexed), status (String, enum: pending, processing, completed, failed), createdAt, lastAttemptedAt, retries, error.  
* \[ \] **Extend src/models/ItemModel.ts**:  
  * \[ \] Add has6MonthHistoryScraped: { type: Boolean, default: false, indexed: true } field.  
* \[ \] **Extend src/services/DataCollectionService.ts**:  
  * \[ \] **Modify discoverAndStoreNewItems()**:  
    * \[ \] After discovering a new item and saving to ItemModel, call queueItemFor6MonthScrape(itemId).  
  * \[ \] **Implement queueItemFor6MonthScrape(itemId: number): Promise\<void\>**:  
    * \[ \] Check ItemModel.findOne({ itemId, has6MonthHistoryScraped: true }) to prevent re-queuing.  
    * \[ \] Use ScrapeQueueModel.findOneAndUpdate for upserting, setting status: 'pending', createdAt, retries: 0\.  
    * \[ \] Log queuing or skipping.  
* \[ \] **Integration:**  
  * \[ \] Ensure ScrapeQueueModel and ItemModel are imported and used in DataCollectionService.ts.  
    \[ \]  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 1.3: Implement Scrape Queue Processing (Playwright & Concurrency)**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION NODE EXPRESS MONGODB MONGOOSE Queueing Logic  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] **Extend src/services/OSRSDataScraperService.ts**:  
  * \[ \] **Implement scrapeIndividualItemPage(itemId: number, itemName: string): Promise\<{timestamp: number, price: number, volume: number}\[\]\>**:  
    * \[ \] Construct individual item page URL.  
    * \[ \] Use Playwright to navigate and extract "Price Daily Average" and "Amount Traded" for the last 6 months.  
    * \[ \] Return array of {timestamp, price, volume}.  
    * \[ \] Implement robust error handling.  
* \[ \] **Extend src/services/DataCollectionService.ts**:  
  * \[ \] **Implement processScrapeQueue(): Promise\<void\>**:  
    * \[ \] Fetch batch of pending or failed (that are ready for retry) items from ScrapeQueueModel. Limit the batch size (e.g., 10-20 items).  
    * \[ \] Use a concurrency control mechanism (e.g., p-limit library or a custom Promise.all with a limited pool) to process items with a **maximum concurrency of 5 simultaneous scrapes**.  
    * \[ \] For each item in the batch:  
      * \[ \] Set ScrapeQueueModel status to processing for the current item.  
      * \[ \] Fetch the itemName from ItemModel using itemId.  
      * \[ \] Call OSRSDataScraperService.scrapeIndividualItemPage(itemId, itemName).  
      * \[ \] If successful:  
        * \[ \] Iterate through the scraped historical data. For each data point, call MarketDataService.saveMarketSnapshot with interval: 'daily\_scrape', itemId, timestamp, price (as highPrice and lowPrice for daily average), and volume.  
        * \[ \] Update ItemModel for this itemId by setting has6MonthHistoryScraped: true.  
        * \[ \] Set ScrapeQueueModel status to completed.  
      * \[ \] If failed:  
        * \[ \] Increment retries in ScrapeQueueModel.  
        * \[ \] Set ScrapeQueueModel status to failed if retries exceeds a defined max (e.g., 3), otherwise keep as pending (for next retry cycle).  
        * \[ \] Store the error message in ScrapeQueueModel.error.  
        * \[ \] Log the error.  
* \[ \] **Extend src/utils/scheduler.ts**:  
  * \[ \] Schedule DataCollectionService.processScrapeQueue() to run frequently (e.g., **every 15 minutes**) to process pending scrapes.  
* \[ \] **Integration:**  
  * \[ \] Ensure MarketDataService, ItemModel, and ScrapeQueueModel are imported into DataCollectionService.ts.  
  * \[ \] Ensure OSRSDataScraperService is correctly updated.  
    \[ \]  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 1.4: Integrate RuneLite API Polling (5m & 1h) with MarketPriceSnapshotModel**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION NODE EXPRESS MONGODB MONGOOSE API Polling  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] **Extend src/services/OSRSWikiService.ts**:  
  * \[ \] Implement fetch5mPrices(): Promise\<any\> that calls the /5m endpoint.  
  * \[ \] Implement fetch1hPrices(): Promise\<any\> that calls the /1h endpoint.  
  * \[ \] Ensure robust global and *per-item* rate limiting, and a circuit breaker pattern for resilience (as per spec.md).  
* \[ \] **Extend src/services/DataCollectionService.ts**:  
  * \[ \] **Implement collect5mMarketData(): Promise\<void\>**:  
    * \[ \] Calls OSRSWikiService.fetch5mPrices().  
    * \[ \] Iterates through the fetched data.  
    * \[ \] For each item, call MarketDataService.saveMarketSnapshot with interval: '5m', mapping itemId, timestamp, avgHighPrice (to highPrice), avgLowPrice (to lowPrice), and volume.  
    * \[ \] Log success/failure.  
  * \[ \] **Implement collect1hMarketData(): Promise\<void\>**:  
    * \[ \] Similar logic to collect5mMarketData, but for the /1h endpoint and interval: '1h'.  
* \[ \] **Extend src/utils/scheduler.ts**:  
  * \[ \] Implement a function startMarketDataPolling():  
    * \[ \] Schedule DataCollectionService.collect5mMarketData() to run **every 5 minutes**.  
    * \[ \] Schedule DataCollectionService.collect1hMarketData() to run **every hour**.  
    * \[ \] Log when each job starts and finishes.  
* \[ \] **Integration:**  
  * \[ \] In src/app.ts, import startMarketDataPolling from src/utils/scheduler.ts.  
  * \[ \] Call startMarketDataPolling() after the database connection is established and initial item mapping is done (Step 1.1 from previous blueprint).  
    \[ \]  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 1.5: Integrate RuneLite API \- Latest (On-Demand)**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION NODE EXPRESS MONGODB MONGOOSE API Polling  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] **Extend src/services/OSRSWikiService.ts**:  
  * \[ \] Implement fetchLatestPrices(): Promise\<any\> that calls the /latest endpoint.  
  * \[ \] Ensure proper rate limiting is applied.  
* \[ \] **Extend src/services/DataCollectionService.ts**:  
  * \[ \] **Implement collectLatestMarketData(): Promise\<void\>**:  
    * \[ \] Calls OSRSWikiService.fetchLatestPrices().  
    * \[ \] Iterates through the fetched data.  
    * \[ \] For each item, call MarketDataService.saveMarketSnapshot with interval: 'latest', mapping itemId, timestamp, highPrice, lowPrice. (Note: /latest does not provide volume directly, so volume can be set to null or 0 for this interval type if not available, or a default value).  
* \[ \] **Extend src/routes/marketDataRoutes.ts**:  
  * \[ \] Add a POST endpoint /api/market-data/collect-latest that triggers DataCollectionService.collectLatestMarketData(). Return a success message (200 OK) or appropriate error status.  
* \[ \] **Integration:**  
  * \[ \] Ensure all new service functions are correctly imported and used by their respective routes.  
    \[ \]  
* \[ \] **Update todo-progress.md**: Mark all completed steps in "Blueprint Phase 1: Data Ingestion Pipeline Enhancements" as done.

## **Phase 2: Frontend Dashboard Enhancements & Completion (Backend Dependencies)**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION NODE EXPRESS MONGODB MONGOOSE  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] **Implement persistence for Watchlist** in TradingDashboard.tsx to **MongoDB**. (This implies backend API endpoints for watchlist management: add, remove, fetch).  
* \[ \] **Enhance useItemPrices.ts** to dynamically fetch a broader range of relevant items (e.g., from "Most Traded" or smart selection) from the unified database. (This implies backend API endpoints for fetching popular/relevant items).  
* \[ \] **Implement "Top Flips Right Now" Leaderboard** and **"Alerts for large margin spikes or dips"** on the TradingDashboard.tsx, derived from the unified database. (This implies backend API endpoints for top flips and alerts).  
* \[ \] Implement "Manual Test Mode" for AI suggestions. (This implies a backend API endpoint for AI simulation: POST /api/ai/manual-test).  
  \[ \]  
* \[ \] **Update todo-progress.md**: Mark all completed steps in "Phase 2: Frontend Dashboard Enhancements & Completion (Backend Dependencies)" as done.