/**
 * 🛡️ API Rate Limiter for RuneScape Wiki API
 * 
 * Implements comprehensive rate limiting to ensure respectful API usage:
 * - Request throttling with configurable limits
 * - Exponential backoff on failures
 * - Request queuing and batching
 * - API health monitoring
 * - Automatic cooldown periods
 */

export interface RateLimitConfig {
  maxRequestsPerMinute: number
  maxRequestsPerHour: number
  maxConcurrentRequests: number
  baseDelayMs: number
  maxRetryDelay: number
  backoffMultiplier: number
  respectfulDelayMs: number
  burstAllowance: number
  cooldownPeriodMs: number
}

export interface RequestStats {
  totalRequests: number
  successfulRequests: number
  failedRequests: number
  rateLimitedRequests: number
  averageResponseTime: number
  lastRequestTime: number
  cooldownUntil: number
}

export class APIRateLimiter {
  private config: RateLimitConfig
  private stats: RequestStats
  private requestQueue: Array<{
    url: string
    options: RequestInit
    resolve: (value: Response) => void
    reject: (error: Error) => void
    priority: number
    timestamp: number
  }> = []
  
  private activeRequests: number = 0
  private requestTimes: number[] = []
  private isProcessing: boolean = false
  
  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = {
      maxRequestsPerMinute: 30,        // Conservative: 30 requests per minute
      maxRequestsPerHour: 1000,        // 1000 requests per hour max
      maxConcurrentRequests: 3,        // Only 3 concurrent requests
      baseDelayMs: 2000,               // 2 second base delay between requests
      maxRetryDelay: 30000,            // Max 30 second retry delay
      backoffMultiplier: 2,            // Double delay on each retry
      respectfulDelayMs: 1000,         // Always wait 1 second between requests
      burstAllowance: 5,               // Allow 5 quick requests then throttle
      cooldownPeriodMs: 300000,        // 5 minute cooldown if rate limited
      ...config
    }
    
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rateLimitedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: 0,
      cooldownUntil: 0
    }
    
    this.logDebug('🛡️ API Rate Limiter initialized', {
      maxRequestsPerMinute: this.config.maxRequestsPerMinute,
      maxConcurrentRequests: this.config.maxConcurrentRequests,
      baseDelay: this.config.baseDelayMs,
      respectfulDelay: this.config.respectfulDelayMs
    })
  }

  /**
   * Make a rate-limited API request
   */
  public async request(url: string, options: RequestInit = {}, priority: number = 1): Promise<Response> {
    return new Promise((resolve, reject) => {
      // Check if we're in cooldown period
      if (this.isInCooldown()) {
        const cooldownRemaining = this.stats.cooldownUntil - Date.now()
        this.logDebug('⏳ Request queued - in cooldown period', {
          url,
          cooldownRemainingMs: cooldownRemaining,
          cooldownRemainingMinutes: Math.ceil(cooldownRemaining / 60000)
        })
      }

      // Add request to queue
      this.requestQueue.push({
        url,
        options: {
          ...options,
          headers: {
            'User-Agent': 'OSRS-Market-Tracker/1.0 (Educational Research - Respectful Usage)',
            'Accept': 'application/json',
            'Cache-Control': 'no-cache',
            ...options.headers
          }
        },
        resolve,
        reject,
        priority,
        timestamp: Date.now()
      })

      // Sort queue by priority (higher priority first)
      this.requestQueue.sort((a, b) => b.priority - a.priority)

      this.logDebug('📝 Request queued', {
        url,
        priority,
        queueLength: this.requestQueue.length,
        activeRequests: this.activeRequests
      })

      // Start processing if not already running
      if (!this.isProcessing) {
        this.processQueue()
      }
    })
  }

  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessing) return
    
    this.isProcessing = true
    this.logDebug('🔄 Starting request queue processing...')

    while (this.requestQueue.length > 0) {
      // Check rate limits before processing
      if (!this.canMakeRequest()) {
        const waitTime = this.calculateWaitTime()
        this.logDebug('⏱️ Rate limit reached, waiting...', {
          waitTimeMs: waitTime,
          queueLength: this.requestQueue.length,
          requestsInLastMinute: this.getRequestsInLastMinute()
        })
        await this.delay(waitTime)
        continue
      }

      // Check cooldown period
      if (this.isInCooldown()) {
        const cooldownRemaining = this.stats.cooldownUntil - Date.now()
        this.logDebug('❄️ In cooldown period, waiting...', {
          cooldownRemainingMs: cooldownRemaining
        })
        await this.delay(Math.min(cooldownRemaining, 60000)) // Check every minute
        continue
      }

      // Process next request
      const request = this.requestQueue.shift()!
      await this.executeRequest(request)

      // Respectful delay between requests
      await this.delay(this.config.respectfulDelayMs)
    }

    this.isProcessing = false
    this.logDebug('✅ Request queue processing completed')
  }

  /**
   * Execute a single request with error handling and retries
   */
  private async executeRequest(request: {
    url: string
    options: RequestInit
    resolve: (value: Response) => void
    reject: (error: Error) => void
    priority: number
    timestamp: number
  }): Promise<void> {
    const startTime = Date.now()
    let retryCount = 0
    let delay = this.config.baseDelayMs

    while (retryCount < 3) { // Max 3 retries
      try {
        this.activeRequests++
        this.stats.totalRequests++
        this.requestTimes.push(Date.now())

        this.logDebug('🌐 Making API request', {
          url: request.url,
          attempt: retryCount + 1,
          activeRequests: this.activeRequests,
          queuedTime: Date.now() - request.timestamp
        })

        const response = await fetch(request.url, request.options)
        const responseTime = Date.now() - startTime

        // Update stats
        this.updateResponseStats(responseTime)
        this.activeRequests--
        this.stats.lastRequestTime = Date.now()

        // Handle rate limiting response
        if (response.status === 429) {
          this.handleRateLimit(response)
          throw new Error('Rate limited by API')
        }

        // Handle other HTTP errors
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        this.stats.successfulRequests++
        this.logDebug('✅ API request successful', {
          url: request.url,
          status: response.status,
          responseTimeMs: responseTime,
          totalRequests: this.stats.totalRequests
        })

        request.resolve(response)
        return

      } catch (error) {
        this.activeRequests--
        this.stats.failedRequests++
        retryCount++

        this.logDebug('❌ API request failed', {
          url: request.url,
          attempt: retryCount,
          error: error instanceof Error ? error.message : 'Unknown error',
          willRetry: retryCount < 3
        })

        if (retryCount >= 3) {
          request.reject(error instanceof Error ? error : new Error('Unknown error'))
          return
        }

        // Exponential backoff
        this.logDebug('⏳ Retrying with exponential backoff', {
          delayMs: delay,
          attempt: retryCount + 1
        })
        await this.delay(delay)
        delay *= this.config.backoffMultiplier
        delay = Math.min(delay, this.config.maxRetryDelay)
      }
    }
  }

  /**
   * Check if we can make a request based on rate limits
   */
  private canMakeRequest(): boolean {
    const now = Date.now()
    
    // Check concurrent request limit
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      return false
    }

    // Check requests per minute
    const requestsInLastMinute = this.getRequestsInLastMinute()
    if (requestsInLastMinute >= this.config.maxRequestsPerMinute) {
      return false
    }

    // Check requests per hour
    const requestsInLastHour = this.getRequestsInLastHour()
    if (requestsInLastHour >= this.config.maxRequestsPerHour) {
      return false
    }

    // Check minimum delay since last request
    const timeSinceLastRequest = now - this.stats.lastRequestTime
    if (timeSinceLastRequest < this.config.respectfulDelayMs) {
      return false
    }

    return true
  }

  /**
   * Calculate how long to wait before next request
   */
  private calculateWaitTime(): number {
    const now = Date.now()
    
    // Time until we can make another request based on rate limits
    const requestsInLastMinute = this.getRequestsInLastMinute()
    if (requestsInLastMinute >= this.config.maxRequestsPerMinute) {
      // Wait until oldest request in current minute expires
      const oldestRequestTime = this.requestTimes.find(time => now - time < 60000)
      if (oldestRequestTime) {
        return 60000 - (now - oldestRequestTime) + 1000 // Extra 1 second buffer
      }
    }

    // Minimum respectful delay
    const timeSinceLastRequest = now - this.stats.lastRequestTime
    if (timeSinceLastRequest < this.config.respectfulDelayMs) {
      return this.config.respectfulDelayMs - timeSinceLastRequest
    }

    return this.config.respectfulDelayMs
  }

  /**
   * Handle rate limit response from API
   */
  private handleRateLimit(response: Response): void {
    this.stats.rateLimitedRequests++
    
    // Check for Retry-After header
    const retryAfter = response.headers.get('Retry-After')
    let cooldownTime = this.config.cooldownPeriodMs

    if (retryAfter) {
      cooldownTime = parseInt(retryAfter) * 1000 // Convert seconds to milliseconds
    }

    this.stats.cooldownUntil = Date.now() + cooldownTime

    this.logDebug('🚫 Rate limited by API', {
      retryAfter: retryAfter,
      cooldownTimeMs: cooldownTime,
      cooldownUntil: new Date(this.stats.cooldownUntil).toISOString()
    })
  }

  /**
   * Check if we're currently in a cooldown period
   */
  private isInCooldown(): boolean {
    return Date.now() < this.stats.cooldownUntil
  }

  /**
   * Get number of requests made in the last minute
   */
  private getRequestsInLastMinute(): number {
    const oneMinuteAgo = Date.now() - 60000
    return this.requestTimes.filter(time => time > oneMinuteAgo).length
  }

  /**
   * Get number of requests made in the last hour
   */
  private getRequestsInLastHour(): number {
    const oneHourAgo = Date.now() - 3600000
    return this.requestTimes.filter(time => time > oneHourAgo).length
  }

  /**
   * Update response time statistics
   */
  private updateResponseStats(responseTime: number): void {
    const totalTime = this.stats.averageResponseTime * (this.stats.successfulRequests - 1) + responseTime
    this.stats.averageResponseTime = totalTime / this.stats.successfulRequests
  }

  /**
   * Clean up old request timestamps
   */
  private cleanupRequestTimes(): void {
    const oneHourAgo = Date.now() - 3600000
    this.requestTimes = this.requestTimes.filter(time => time > oneHourAgo)
  }

  /**
   * Get comprehensive rate limiter statistics
   */
  public getStats(): RequestStats & {
    queueLength: number
    activeRequests: number
    requestsInLastMinute: number
    requestsInLastHour: number
    isInCooldown: boolean
    canMakeRequest: boolean
    config: RateLimitConfig
  } {
    this.cleanupRequestTimes()
    
    return {
      ...this.stats,
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      requestsInLastMinute: this.getRequestsInLastMinute(),
      requestsInLastHour: this.getRequestsInLastHour(),
      isInCooldown: this.isInCooldown(),
      canMakeRequest: this.canMakeRequest(),
      config: this.config
    }
  }

  /**
   * Update rate limiter configuration
   */
  public updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = { ...this.config, ...newConfig }
    this.logDebug('⚙️ Rate limiter configuration updated', newConfig)
  }

  /**
   * Clear all queued requests (emergency stop)
   */
  public clearQueue(): void {
    const queueLength = this.requestQueue.length
    this.requestQueue.forEach(request => {
      request.reject(new Error('Request cancelled - queue cleared'))
    })
    this.requestQueue = []
    this.logDebug('🛑 Request queue cleared', { cancelledRequests: queueLength })
  }

  /**
   * Get health status of the rate limiter
   */
  public getHealth(): {
    status: 'HEALTHY' | 'THROTTLED' | 'COOLDOWN' | 'OVERLOADED'
    message: string
    metrics: any
  } {
    const stats = this.getStats()
    
    if (this.isInCooldown()) {
      return {
        status: 'COOLDOWN',
        message: `In cooldown period until ${new Date(stats.cooldownUntil).toLocaleTimeString()}`,
        metrics: stats
      }
    }

    if (stats.queueLength > 50) {
      return {
        status: 'OVERLOADED',
        message: `Queue overloaded with ${stats.queueLength} pending requests`,
        metrics: stats
      }
    }

    if (stats.requestsInLastMinute >= this.config.maxRequestsPerMinute * 0.8) {
      return {
        status: 'THROTTLED',
        message: `Approaching rate limit: ${stats.requestsInLastMinute}/${this.config.maxRequestsPerMinute} requests per minute`,
        metrics: stats
      }
    }

    return {
      status: 'HEALTHY',
      message: 'Rate limiter operating normally',
      metrics: stats
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * Debug logging
   */
  private logDebug(message: string, data?: any): void {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [RateLimiter-Debug] ${message}`, data ? JSON.stringify(data, null, 2) : '')
  }
}