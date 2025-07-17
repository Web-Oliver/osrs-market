# OSRS Market Analysis & Gold-Making Documentation

## 📊 Overview

This documentation outlines comprehensive strategies for OSRS (Old School RuneScape) market analysis, item flipping, and automated gold-making using real-time market data and advanced algorithmic trading techniques.

## 🔌 API Integration

### RuneScape Wiki Real-time Prices API

**Base URL**: `https://prices.runescape.wiki/api/v1/osrs`

#### Available Endpoints

| Endpoint | Description | Use Case |
|----------|-------------|----------|
| `/latest` | Current high/low prices for all items | Real-time price monitoring |
| `/mapping` | Item details (name, ID, examine text) | Item catalog integration |
| `/5m` | 5-minute average prices | Short-term trend analysis |
| `/1h` | Hourly average prices | Medium-term trend analysis |
| `/timeseries` | Historical price data | Long-term analysis & backtesting |

#### Data Structure

```json
{
  "data": {
    "4151": {  // Abyssal whip ID
      "high": 3200000,
      "highTime": 1615733400,
      "low": 3150000,
      "lowTime": 1615733300
    }
  }
}
```

### OSRS Grand Exchange API

**Base URL**: `https://secure.runescape.com/m=itemdb_oldschool/api/catalogue/items.json`

**Parameters**:
- `category=1` (default category)
- `alpha=c` (first letter filter)
- `page=1` (pagination)

## 📈 Market Analysis Strategies

### 1. Price Spread Analysis

**Concept**: Monitor bid-ask spreads to identify profitable flipping opportunities.

**Key Metrics**:
- **Spread %**: `(high - low) / low * 100`
- **Volume Indicator**: Transaction frequency
- **Price Volatility**: Standard deviation of prices

**Implementation**:
```python
def calculate_spread_percentage(high_price, low_price):
    if low_price == 0:
        return 0
    return ((high_price - low_price) / low_price) * 100

def is_profitable_flip(spread_pct, min_profit_margin=5.0):
    return spread_pct >= min_profit_margin
```

### 2. Moving Average Convergence Divergence (MACD)

**Purpose**: Identify trend reversals and momentum shifts.

**Formula**:
- EMA12 - EMA26 = MACD Line
- Signal Line = EMA9 of MACD Line
- Histogram = MACD Line - Signal Line

### 3. Relative Strength Index (RSI)

**Purpose**: Identify overbought/oversold conditions.

**Signals**:
- RSI > 70: Overbought (potential sell signal)
- RSI < 30: Oversold (potential buy signal)

### 4. Bollinger Bands

**Purpose**: Identify price breakouts and mean reversion opportunities.

**Components**:
- Middle Band: 20-period Moving Average
- Upper Band: Middle Band + (2 × Standard Deviation)
- Lower Band: Middle Band - (2 × Standard Deviation)

## 💰 Gold-Making Strategies

### Tier S: High-Volume, Low-Risk Flips

#### 1. **Consumables & Supplies**
- **Items**: Food, potions, runes, arrows
- **Strategy**: Buy during off-peak hours, sell during peak times
- **Profit Margin**: 3-8%
- **Volume**: High
- **Risk**: Very Low

**Example Items**:
- Sharks (Buy: 800gp, Sell: 850gp, Margin: 6.25%)
- Prayer Potions (Buy: 9,500gp, Sell: 10,200gp, Margin: 7.37%)

#### 2. **Raw Materials**
- **Items**: Logs, ores, herbs
- **Strategy**: Buy from suppliers, sell to processors
- **Profit Margin**: 5-12%
- **Volume**: Very High
- **Risk**: Low

### Tier A: Medium-Volume, Medium-Risk Flips

#### 1. **Equipment & Weapons**
- **Items**: Barrows gear, Godswords, high-level equipment
- **Strategy**: Time-based flipping around game updates
- **Profit Margin**: 8-15%
- **Volume**: Medium
- **Risk**: Medium

#### 2. **Rare Items**
- **Items**: Third-age gear, expensive pets, unique drops
- **Strategy**: Long-term holds during market cycles
- **Profit Margin**: 15-30%
- **Volume**: Low
- **Risk**: High

### Tier B: Specialized Strategies

#### 1. **Event-Based Trading**
- **Strategy**: Trade items affected by seasonal events
- **Examples**: Christmas items, Halloween masks
- **Timing**: Buy before events, sell during/after

#### 2. **Update Speculation**
- **Strategy**: Predict item value changes from game updates
- **Research**: Follow OSRS news, polls, beta testing
- **Risk**: Very High, Very High Reward

## 🤖 Automated Trading Implementation

### Core Trading Algorithm

```python
class OSRSMarketTrader:
    def __init__(self):
        self.api_client = OSRSApi()
        self.portfolio = Portfolio()
        self.risk_manager = RiskManager()
    
    def analyze_market(self, item_id):
        # Get current and historical data
        current = self.api_client.get_latest_price(item_id)
        historical = self.api_client.get_timeseries(item_id, period='24h')
        
        # Calculate technical indicators
        rsi = self.calculate_rsi(historical)
        macd = self.calculate_macd(historical)
        spread_pct = self.calculate_spread(current)
        
        return {
            'rsi': rsi,
            'macd': macd,
            'spread_percentage': spread_pct,
            'signal': self.generate_signal(rsi, macd, spread_pct)
        }
    
    def generate_signal(self, rsi, macd, spread_pct):
        signals = []
        
        # RSI signals
        if rsi < 30 and spread_pct > 5:
            signals.append('BUY')
        elif rsi > 70:
            signals.append('SELL')
        
        # MACD signals
        if macd['histogram'] > 0 and macd['signal_line'] > 0:
            signals.append('BUY')
        elif macd['histogram'] < 0:
            signals.append('SELL')
        
        # Return dominant signal
        return max(set(signals), key=signals.count) if signals else 'HOLD'
```

### Risk Management Framework

```python
class RiskManager:
    def __init__(self, max_position_size=0.1, stop_loss_pct=5.0):
        self.max_position_size = max_position_size  # 10% of portfolio
        self.stop_loss_pct = stop_loss_pct  # 5% stop loss
    
    def validate_trade(self, item_price, quantity, portfolio_value):
        position_value = item_price * quantity
        position_ratio = position_value / portfolio_value
        
        return position_ratio <= self.max_position_size
    
    def calculate_stop_loss(self, entry_price):
        return entry_price * (1 - self.stop_loss_pct / 100)
```

## 📊 Performance Monitoring

### Key Performance Indicators (KPIs)

1. **Return on Investment (ROI)**
   - Formula: `(Profit - Investment) / Investment * 100`
   - Target: >20% monthly ROI

2. **Win Rate**
   - Formula: `Successful Trades / Total Trades * 100`
   - Target: >65% win rate

3. **Average Profit per Trade**
   - Formula: `Total Profit / Number of Trades`
   - Target: >100k GP per trade

4. **Maximum Drawdown**
   - Track largest portfolio decline
   - Target: <10% maximum drawdown

### Monitoring Dashboard Metrics

```python
class PerformanceTracker:
    def __init__(self):
        self.trades = []
        self.portfolio_history = []
    
    def calculate_metrics(self):
        total_trades = len(self.trades)
        profitable_trades = len([t for t in self.trades if t.profit > 0])
        
        return {
            'total_trades': total_trades,
            'win_rate': (profitable_trades / total_trades) * 100,
            'total_profit': sum(t.profit for t in self.trades),
            'average_profit': sum(t.profit for t in self.trades) / total_trades,
            'roi': self.calculate_roi(),
            'sharpe_ratio': self.calculate_sharpe_ratio()
        }
```

## 🎯 Comprehensive Gold-Making Plan

### Phase 1: Foundation (Capital: 1M - 10M GP)

**Objective**: Build consistent cash flow with low-risk trades

**Strategy**:
1. Focus on high-volume consumables
2. Target 3-5% profit margins
3. Execute 20-30 trades per day
4. Reinvest all profits

**Target Items**:
- Food items (Sharks, Karambwans)
- Basic potions (Combat, Prayer)
- Runes (Nature, Law, Death)

**Expected Daily Profit**: 200k - 500k GP

### Phase 2: Scaling (Capital: 10M - 100M GP)

**Objective**: Increase trade size and diversify into equipment

**Strategy**:
1. Add medium-tier equipment flips
2. Implement technical analysis
3. Use automated monitoring tools
4. Target 5-10% profit margins

**Target Items**:
- Barrows equipment
- Dragon weapons
- High-level crafting materials

**Expected Daily Profit**: 1M - 3M GP

### Phase 3: Advanced (Capital: 100M+ GP)

**Objective**: High-value trades and market manipulation resistance

**Strategy**:
1. Focus on rare and expensive items
2. Long-term position trading
3. Event-based speculation
4. Portfolio diversification

**Target Items**:
- Third-age equipment
- Expensive pets
- Rare discontinued items

**Expected Daily Profit**: 5M - 20M GP

## 🔒 Risk Mitigation

### 1. Diversification Rules
- Maximum 20% of capital in any single item
- Spread across different item categories
- Avoid items affected by the same game mechanics

### 2. Market Conditions Monitoring
- Track overall market sentiment
- Monitor for unusual trading patterns
- Adjust strategies based on game updates

### 3. Liquidity Management
- Maintain 30% cash reserves
- Focus on items with high trade volume
- Avoid illiquid items during uncertain periods

## 🚀 Implementation Roadmap

### Week 1-2: Setup & Testing
- [ ] Implement API integrations
- [ ] Build basic monitoring dashboard
- [ ] Test with small capital (1M GP)
- [ ] Validate data accuracy

### Week 3-4: Strategy Deployment
- [ ] Deploy automated trading algorithms
- [ ] Implement risk management systems
- [ ] Start with Tier S items only
- [ ] Monitor performance metrics

### Month 2: Optimization
- [ ] Refine algorithms based on performance
- [ ] Add Tier A items to portfolio
- [ ] Implement advanced technical indicators
- [ ] Scale capital allocation

### Month 3+: Advanced Features
- [ ] Machine learning price prediction
- [ ] Cross-market arbitrage opportunities
- [ ] Advanced portfolio optimization
- [ ] Market sentiment analysis

## 📚 Best Practices

### Data Management
- Cache API responses to respect rate limits
- Implement data validation and error handling
- Store historical data for backtesting
- Use efficient data structures for real-time processing

### Trading Discipline
- Never deviate from risk management rules
- Maintain detailed trade logs
- Regular strategy performance reviews
- Continuous learning and adaptation

### Legal & Ethical Considerations
- Comply with OSRS Terms of Service
- Avoid market manipulation
- Respect API rate limits
- Fair trading practices

## 🔧 Technical Requirements

### Development Stack
- **Backend**: Node.js/Python for API integration
- **Frontend**: React.js for dashboard
- **Database**: PostgreSQL for data storage
- **Monitoring**: Real-time charts and alerts

### Infrastructure
- **Hosting**: Cloud-based for 24/7 operation
- **Backup**: Automated data backups
- **Security**: API key management and encryption
- **Scaling**: Load balancing for high-frequency trading

---

*This documentation serves as a comprehensive guide for OSRS market analysis and automated gold-making. Success requires discipline, continuous monitoring, and adaptation to changing market conditions.*