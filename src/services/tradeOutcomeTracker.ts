import type { TradeOutcome, MarketState, TradingAction } from '../types/aiTrading'

export class TradeOutcomeTracker {
  private outcomes: TradeOutcome[] = []
  private activeTrades: Map<string, {
    action: TradingAction
    startState: MarketState
    startTime: number
  }> = new Map()

  public startTrade(tradeId: string, action: TradingAction, marketState: MarketState): void {
    this.activeTrades.set(tradeId, {
      action,
      startState: marketState,
      startTime: Date.now()
    })
  }

  public completeTrade(
    tradeId: string,
    finalPrice: number,
    marketState: MarketState,
    success: boolean = true
  ): TradeOutcome | null {
    const activeTrade = this.activeTrades.get(tradeId)
    if (!activeTrade) {
      console.warn(`No active trade found for ID: ${tradeId}`)
      return null
    }

    const { action, startState, startTime } = activeTrade
    const endTime = Date.now()
    const timeToComplete = (endTime - startTime) / (60 * 1000) // minutes

    let profit = 0
    if (action.type === 'BUY') {
      profit = (finalPrice - action.price) * action.quantity
    } else if (action.type === 'SELL') {
      profit = (action.price - finalPrice) * action.quantity
    }

    const profitPercentage = action.price > 0 ? (profit / (action.price * action.quantity)) * 100 : 0

    const outcome: TradeOutcome = {
      id: tradeId,
      itemId: action.itemId,
      itemName: `Item_${action.itemId}`, // Would be resolved from item database
      buyPrice: action.type === 'BUY' ? action.price : finalPrice,
      sellPrice: action.type === 'SELL' ? action.price : finalPrice,
      quantity: action.quantity,
      buyTime: action.type === 'BUY' ? startTime : endTime,
      sellTime: action.type === 'SELL' ? startTime : endTime,
      profit,
      profitPercentage,
      success,
      marketCondition: this.determineMarketCondition(startState, marketState),
      timeToComplete
    }

    this.outcomes.push(outcome)
    this.activeTrades.delete(tradeId)

    // Keep only last 10000 outcomes to manage memory
    if (this.outcomes.length > 10000) {
      this.outcomes = this.outcomes.slice(-10000)
    }

    return outcome
  }

  private determineMarketCondition(
    startState: MarketState,
    endState: MarketState
  ): 'BULLISH' | 'BEARISH' | 'SIDEWAYS' {
    const priceChange = ((endState.price - startState.price) / startState.price) * 100

    if (priceChange > 2) return 'BULLISH'
    if (priceChange < -2) return 'BEARISH'
    return 'SIDEWAYS'
  }

  public getOutcomesByTimeRange(startTime: number, endTime: number): TradeOutcome[] {
    return this.outcomes.filter(
      outcome => outcome.buyTime >= startTime && outcome.sellTime <= endTime
    )
  }

  public getOutcomesByItem(itemId: number): TradeOutcome[] {
    return this.outcomes.filter(outcome => outcome.itemId === itemId)
  }

  public getSuccessfulTrades(): TradeOutcome[] {
    return this.outcomes.filter(outcome => outcome.success && outcome.profit > 0)
  }

  public getFailedTrades(): TradeOutcome[] {
    return this.outcomes.filter(outcome => !outcome.success || outcome.profit <= 0)
  }

  public calculatePerformanceMetrics(timeRangeMs?: number) {
    const cutoffTime = timeRangeMs ? Date.now() - timeRangeMs : 0
    const relevantOutcomes = this.outcomes.filter(
      outcome => outcome.sellTime >= cutoffTime
    )

    if (relevantOutcomes.length === 0) {
      return {
        totalTrades: 0,
        successRate: 0,
        averageProfit: 0,
        totalProfit: 0,
        averageTimeToComplete: 0,
        profitFactor: 0,
        maxDrawdown: 0,
        winningStreak: 0,
        losingStreak: 0
      }
    }

    const totalTrades = relevantOutcomes.length
    const successfulTrades = relevantOutcomes.filter(
      outcome => outcome.success && outcome.profit > 0
    )
    const successRate = (successfulTrades.length / totalTrades) * 100

    const totalProfit = relevantOutcomes.reduce((sum, outcome) => sum + outcome.profit, 0)
    const averageProfit = totalProfit / totalTrades

    const averageTimeToComplete = relevantOutcomes.reduce(
      (sum, outcome) => sum + outcome.timeToComplete, 0
    ) / totalTrades

    // Calculate profit factor (gross profit / gross loss)
    const grossProfit = relevantOutcomes
      .filter(outcome => outcome.profit > 0)
      .reduce((sum, outcome) => sum + outcome.profit, 0)

    const grossLoss = Math.abs(
      relevantOutcomes
        .filter(outcome => outcome.profit < 0)
        .reduce((sum, outcome) => sum + outcome.profit, 0)
    )

    const profitFactor = grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? Infinity : 0

    // Calculate maximum drawdown
    let runningProfit = 0
    let peak = 0
    let maxDrawdown = 0

    for (const outcome of relevantOutcomes) {
      runningProfit += outcome.profit
      if (runningProfit > peak) {
        peak = runningProfit
      }
      const drawdown = peak - runningProfit
      if (drawdown > maxDrawdown) {
        maxDrawdown = drawdown
      }
    }

    // Calculate streaks
    let currentWinStreak = 0
    let currentLoseStreak = 0
    let maxWinStreak = 0
    let maxLoseStreak = 0

    for (const outcome of relevantOutcomes) {
      if (outcome.profit > 0) {
        currentWinStreak++
        currentLoseStreak = 0
        maxWinStreak = Math.max(maxWinStreak, currentWinStreak)
      } else {
        currentLoseStreak++
        currentWinStreak = 0
        maxLoseStreak = Math.max(maxLoseStreak, currentLoseStreak)
      }
    }

    return {
      totalTrades,
      successRate,
      averageProfit,
      totalProfit,
      averageTimeToComplete,
      profitFactor,
      maxDrawdown,
      winningStreak: maxWinStreak,
      losingStreak: maxLoseStreak
    }
  }

  public getTradeAnalyticsByMarketCondition() {
    const byCondition = {
      BULLISH: this.outcomes.filter(o => o.marketCondition === 'BULLISH'),
      BEARISH: this.outcomes.filter(o => o.marketCondition === 'BEARISH'),
      SIDEWAYS: this.outcomes.filter(o => o.marketCondition === 'SIDEWAYS')
    }

    return Object.entries(byCondition).map(([condition, trades]) => ({
      condition,
      totalTrades: trades.length,
      successRate: trades.length > 0 
        ? (trades.filter(t => t.profit > 0).length / trades.length) * 100 
        : 0,
      averageProfit: trades.length > 0 
        ? trades.reduce((sum, t) => sum + t.profit, 0) / trades.length 
        : 0,
      totalProfit: trades.reduce((sum, t) => sum + t.profit, 0)
    }))
  }

  public generateLearningData() {
    return this.outcomes.map(outcome => ({
      // Features (inputs)
      itemId: outcome.itemId,
      timeOfDay: new Date(outcome.buyTime).getHours(),
      dayOfWeek: new Date(outcome.buyTime).getDay(),
      marketCondition: outcome.marketCondition,
      tradeType: outcome.buyPrice < outcome.sellPrice ? 'BUY_FIRST' : 'SELL_FIRST',
      priceLevel: outcome.buyPrice,
      
      // Labels (outputs)
      profit: outcome.profit,
      success: outcome.success,
      profitPercentage: outcome.profitPercentage,
      timeToComplete: outcome.timeToComplete
    }))
  }

  public exportToCSV(): string {
    if (this.outcomes.length === 0) return ''

    const headers = Object.keys(this.outcomes[0]).join(',')
    const rows = this.outcomes.map(outcome => 
      Object.values(outcome).map(value => 
        typeof value === 'string' ? `"${value}"` : value
      ).join(',')
    ).join('\n')

    return `${headers}\n${rows}`
  }

  public getAllOutcomes(): TradeOutcome[] {
    return [...this.outcomes]
  }

  public clearHistory(): void {
    this.outcomes = []
    this.activeTrades.clear()
  }

  public getActiveTradesCount(): number {
    return this.activeTrades.size
  }

  public getOutcomesCount(): number {
    return this.outcomes.length
  }
}