# **Frontend To-Do List**

This checklist outlines the remaining tasks for the React frontend of the OSRS Flipping AI App, based on the provided project specifications.

## **Blueprint Phase 5: Core Frontend Dashboard Features**

### **Step 5.1: Custom Notification Component & Hook**

* \[x\] USE CONTEXT7 FOR DOCUMETNATION TAILWINDCSS Core Frontend Dashboard Features  
* \[x\] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[x\] Create src/components/NotificationToast.tsx:  
  * \[x\] Define React functional component NotificationToast.  
  * \[x\] Accept props: id, message, type, onDismiss.  
  * \[x\] Implement Tailwind CSS styling for bg-opacity-90, shadow-lg, rounded-lg, p-4, m-2.  
  * \[x\] Apply distinct styling (colors, icons from lucide-react or SVG) for success, error, warning, info types.  
  * \[x\] Position fixed at top-right.  
  * \[x\] Include "X" (close) button and click-anywhere dismissal.  
  * \[x\] Add ARIA attributes (role="alert", aria-live="assertive").  
* \[x\] Create src/hooks/useNotifications.ts:  
  * \[x\] Implement custom React hook useNotifications.  
  * \[x\] Provide showSuccess(), showError(), showWarning(), showInfo() functions.  
  * \[x\] Return array of active notifications and dismissNotification(id).  
  * \[x\] Generate unique id for each notification (e.g., crypto.randomUUID()).  
* \[x\] **Integration:**  
  * \[x\] In App.tsx, import and use useNotifications.  
  * \[x\] Render NotificationToast components dynamically.  
  * \[x\] Add demonstration buttons in App.tsx to trigger different toast types.  
    \[x\] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.2: Replace Alerts in AITradingDashboard.tsx & AutoTrainingDashboard.tsx**

* \[x\] USE CONTEXT7 FOR DOCUMETNATION TAILWINDCS custom notification component  
* \[x\] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[x\] Modify src/components/AITradingDashboard.tsx:  
  * \[x\] Locate and replace all alert() calls with useNotifications functions (showSuccess(), showError(), etc.).  
  * \[x\] Ensure useNotifications is imported and used.  
* \[x\] Modify src/components/AutoTrainingDashboard.tsx:  
  * \[x\] Locate and replace all alert() calls with useNotifications functions (showSuccess(), showError(), etc.).  
  * \[x\] Ensure useNotifications is imported and used.  
* \[x\] **Integration:**  
  * \[x\] Verify AITradingDashboard.tsx and AutoTrainingDashboard.tsx are correctly rendered in App.tsx.  
    \[x\] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.3: Implement Full Charting in AITradingDashboard.tsx & AutoTrainingDashboard.tsx (Recharts)**

* \[x\] USE CONTEXT7 FOR DOCUMETNATION TAILWINDCS Dashboard, Recharts  
* \[x\] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[x\] Install recharts dependency.  
* \[x\] Modify src/components/AITradingDashboard.tsx:  
  * \[x\] In "Training Progress" section, replace static numbers with actual charts.  
  * \[x\] Use **Recharts LineChart** components to visualize:  
    * \[x\] **Loss Curve**: X-axis: Time (Timestamp), Y-axis: Loss Value.  
    * \[x\] **Reward History**: X-axis: Time (Timestamp), Y-axis: Reward Value.  
    * \[x\] **Epsilon Decay**: X-axis: Time (Timestamp), Y-axis: Epsilon Value.  
    * \[x\] **Portfolio Value Trend**: X-axis: Time (Timestamp), Y-axis: Portfolio Value.  
  * \[x\] For now, use **mock data** for these charts. Create a mock array of objects, where each object represents a data point with timestamp, loss, reward, epsilon, portfolioValue fields.  
  * \[x\] Ensure charts are responsive and visually appealing using Tailwind CSS.  
* \[x\] Modify src/components/AutoTrainingDashboard.tsx:  
  * \[x\] Add similar Recharts LineChart components for training progress in "Recent Training Metrics" section.  
  * \[x\] Use mock data.  
* \[x\] **Integration:**  
  * \[x\] Ensure recharts components are imported correctly.  
  * \[x\] Manage mock data within component's state or a simple mock hook for now.  
    \[x\] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.4: Hook up Live Console Output (WebSockets)**

* \[x\] USE CONTEXT7 FOR DOCUMETNATION WebSockets  
* \[x\] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[x\] Modify src/components/LiveMonitoringDashboard.tsx:  
  * \[x\] In the "Live Console Output" section, replace the mocked static div elements with a dynamic display that consumes messages from a WebSocket.  
  * \[x\] Implement a useEffect hook to establish a WebSocket connection when the component mounts and close it when it unmounts.  
  * \[x\] The WebSocket URL should be configurable (e.g., ws://localhost:8080/ws/logs).  
  * \[x\] When a message is received from the WebSocket:  
    * \[x\] Parse the message (assume it's JSON).  
    * \[x\] Each log entry should include: timestamp (Unix milliseconds), level (e.g., 'info', 'warn', 'error', 'debug'), service (e.g., 'DataScraper', 'MarketAnalysis', 'AITraining'), message (the log content), and optionally itemId and traceId.  
    * \[x\] Display the log entries in a scrollable container, formatted nicely using formatters.ts for the timestamp.  
    * \[x\] Apply distinct styling (e.g., text color) based on the level of the log.  
  * \[x\] Implement basic error handling for WebSocket connection failures.  
* \[x\] **Integration:**  
  * \[x\] Ensure LiveMonitoringDashboard.tsx is correctly imported and rendered in App.tsx.  
    \[x\] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.5: Implement Watchlist Persistence (MongoDB via Backend API)**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION Watchlist Persistence (MongoDB via Backend API)  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] Modify src/components/TradingDashboard.tsx:  
  * \[ \] Replace the local state management for the watchlist (useState) with logic that fetches, adds, and removes items from the backend API.  
* \[ \] Create a custom hook useWatchlist.ts:  
  * \[ \] This hook should manage fetching the watchlist from /api/watchlist on component mount, and provide functions addItemToWatchlist(itemId: number) and removeItemFromWatchlist(itemId: number).  
  * \[ \] It should handle loading and error states.  
  * \[ \] For now, assume a userId is hardcoded or mocked (as user authentication is not yet implemented).  
  * \[ \] It should return the current watchlist array.  
* \[ \] In TradingDashboard.tsx, import and use useWatchlist.  
* \[ \] Update the "Add to Watchlist" button in FlippingOpportunityCard.tsx (which is rendered by TradingDashboard.tsx) to call addItemToWatchlist.  
* \[ \] Add a "Remove from Watchlist" button or similar functionality to display and manage watchlist items.  
* \[ \] **Integration:**  
  * \[ \] Ensure TradingDashboard.tsx and FlippingOpportunityCard.tsx are correctly imported and rendered.  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.6: Enhance useItemPrices.ts for Dynamic Item Fetching**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION Dynamic Fetching  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] Modify src/hooks/useItemPrices.ts:  
  * \[ \] Replace the hardcoded list of "popular items" and their mock data.  
  * \[ \] Implement fetch calls to a backend API endpoint (e.g., /api/items/popular or /api/market-data/top-opportunities) that provides a list of relevant items with their current prices and basic metrics.  
  * \[ \] The API should return data structured similarly to what useItemPrices currently expects (e.g., id, name, currentPrice, marginGp, marginPercent, volume).  
  * \[ \] Handle loading and error states during the actual API fetch.  
* \[ \] **Integration:**  
  * \[ \] Ensure useItemPrices.ts is used by TradingDashboard.tsx and any other relevant components.  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.7: Implement "Top Flips Right Now" Leaderboard & Alerts Display**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION TAILWIND Leaderboard & Alerts Display  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] Modify src/components/TradingDashboard.tsx:  
  * \[ \] In the "Top Opportunities" section, ensure it explicitly displays the "Top 5 profitable items currently" from useMarketAnalysis.  
  * \[ \] For each item, display relevant tags like 'low risk', 'fast flip', 'volatile', etc., based on data received from the backend.  
  * \[ \] In the "Alerts for large margin spikes or dips" section, display the activeAlerts from useMarketAnalysis.  
  * \[ \] Each alert should clearly show its message, type, and associated item (if applicable).  
* \[ \] Modify src/hooks/useMarketAnalysis.ts:  
  * \[ \] Replace the mock data for topOpportunities and activeAlerts.  
  * \[ \] Implement fetch calls to backend API endpoints (e.g., /api/market-data/top-flips and /api/market-data/alerts).  
  * \[ \] The topOpportunities API should return items with a calculated "Profitability Score" and relevant tags.  
  * \[ \] The activeAlerts API should return alerts with message, type, and itemId.  
  * \[ \] Handle loading and error states.  
* \[ \] **Integration:**  
  * \[ \] Ensure TradingDashboard.tsx correctly uses useMarketAnalysis to display this data.  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.8: Implement "Manual Test Mode"**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION TAILWIND Manual Test Mode  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] Modify src/components/TradingDashboard.tsx (or a new sub-component):  
  * \[ \] Create a dedicated section for "Manual Test Mode".  
  * \[ \] Include input fields for:  
    * \[ \] Gold Amount (Number input)  
    * \[ \] Item ID (Number input)  
    * \[ \] Max Holding Time (e.g., Number input for hours or days)  
  * \[ \] Add a "Simulate Flip" button.  
  * \[ \] Below the button, create a display area for the simulation results.  
* \[ \] **Implement Simulation Logic**:  
  * \[ \] When the "Simulate Flip" button is clicked:  
    * \[ \] Collect the input values.  
    * \[ \] Make an API call to the backend endpoint (e.g., POST /api/ai/manual-test) with the input data.  
    * \[ \] The backend should return estimated profit, estimated time to complete flip, risk assessment, and suggested buy/sell prices.  
    * \[ \] Display these results clearly in the designated area.  
  * \[ \] Handle loading states (e.g., disable button, show spinner) and error states (e.g., display error toast using useNotifications).  
* \[ \] **Integration:**  
  * \[ \] Ensure the "Manual Test Mode" section is integrated logically within TradingDashboard.tsx.  
    \[ \] UPDATE THE TODO-PROGRESS.MD FILE AND CHECK OFF WHAT YOU DID

### **Step 5.9: Evaluate & Consolidate ItemCard.tsx**

* \[ \] USE CONTEXT7 FOR DOCUMETNATION TAILWIND ItemCard.tsx  
* \[ \] CONTEXT7 IS A MCP FOR FINDING DOCUMENTATION NOT A PATTERN USE CONTEXT7 MCP YOU HAVE AVALIBLE  
* \[ \] Review src/components/ItemCard.tsx:  
  * \[ \] Analyze its current usage and the data it displays.  
* \[ \] Compare with src/components/FlippingOpportunityCard.tsx:  
  * \[ \] Determine if FlippingOpportunityCard.tsx (or a slightly modified/generalized version of it) can effectively display all the information currently handled by ItemCard.tsx.  
* \[ \] **Consolidate (if feasible)**:  
  * \[ \] If FlippingOpportunityCard.tsx can replace ItemCard.tsx:  
    * \[ \] Remove ItemCard.tsx.  
    * \[ \] Refactor any components that currently use ItemCard.tsx to instead use FlippingOpportunityCard.tsx.  
    * \[ \] Ensure all necessary props are passed and styling is maintained.  
  * \[ \] If ItemCard.tsx serves a distinct, necessary purpose not covered by FlippingOpportunityCard.tsx, then keep it but add a comment explaining its specific role.  
* \[ \] **Integration:**  
  * \[ \] Ensure the application continues to function correctly after consolidation or decision to keep ItemCard.tsx.  
    \[ \]  
* \[ \] **Update todo-progress.md**: Mark all completed steps in "Blueprint Phase 5: Core Frontend Dashboard Features" as done.