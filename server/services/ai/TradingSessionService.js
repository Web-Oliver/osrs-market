/**
 * 🎯 Trading Session Service - SOLID Optimized
 *
 * Single Responsibility Principle:
 * - ONLY manages trading session lifecycle
 * - Session creation, tracking, and termination
 * - Session state management and persistence
 *
 * Extracted from AITradingOrchestratorService to eliminate God Class
 */

const { BaseService } = require('../BaseService');
const { AIModelMetadata } = require('../../models/AIModelMetadata');

class TradingSessionService extends BaseService {
  constructor(dependencies = {}) {
    super('TradingSessionService', {
      enableCache: true,
      cachePrefix: 'trading_sessions',
      cacheTTL: 3600,
      enableMongoDB: true
    });

    this.activeSessions = new Map();
    this.sessionHistory = [];
  }

  /**
   * Create new trading session
   */
  createSession(config = {}) {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const session = {
      id: sessionId,
      startTime: Date.now(),
      config: {
        minProfitMargin: config.minProfitMargin || 0.05,
        maxItemValue: config.maxItemValue || 2000000000,
        focusOnHighVolume: config.focusOnHighVolume || true,
        ...config
      },
      metrics: {
        episodeCount: 0,
        totalTrades: 0,
        totalProfit: 0,
        bestReward: -Infinity,
        averageReward: 0,
        successRate: 0
      },
      status: 'ACTIVE',
      modelVersion: '1.0',
      createdAt: new Date()
    };

    this.activeSessions.set(sessionId, session);

    this.logger.info('Created trading session', {
      sessionId,
      config: session.config
    });

    return session;
  }

  /**
   * Update session metrics
   */
  updateSessionMetrics(sessionId, metrics) {
    const session = this.activeSessions.get(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    // Update metrics
    Object.assign(session.metrics, metrics);
    session.lastUpdated = new Date();

    // Calculate derived metrics
    if (session.metrics.totalTrades > 0) {
      session.metrics.averageReward = session.metrics.totalProfit / session.metrics.totalTrades;
      session.metrics.successRate = (session.metrics.successfulTrades || 0) / session.metrics.totalTrades;
    }

    this.logger.debug('Updated session metrics', {
      sessionId,
      metrics: session.metrics
    });

    return session;
  }

  /**
   * Get session status
   */
  getSession(sessionId) {
    return this.activeSessions.get(sessionId);
  }

  /**
   * Get all active sessions
   */
  getActiveSessions() {
    return Array.from(this.activeSessions.values());
  }

  /**
   * End trading session
   */
  async endSession() {
    return this.execute(async() => {
      await this.saveSessionToDatabase(session);
    }, 'endSession', { logSuccess: true });
  }

  /**
   * Get session performance summary
   */
  getSessionSummary(sessionId) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error(`Session ${sessionId} not found`);
    }

    return {
      sessionId: session.id,
      status: session.status,
      duration: session.endTime ? session.endTime - session.startTime : Date.now() - session.startTime,
      performance: {
        totalTrades: session.metrics.totalTrades,
        totalProfit: session.metrics.totalProfit,
        averageReward: session.metrics.averageReward,
        successRate: session.metrics.successRate,
        bestReward: session.metrics.bestReward
      },
      config: session.config,
      lastUpdated: session.lastUpdated
    };
  }

  /**
   * Cleanup old sessions
   */
  cleanupOldSessions(maxAge = 24 * 60 * 60 * 1000) { // 24 hours
    const cutoff = Date.now() - maxAge;
    let cleaned = 0;

    for (const [sessionId, session] of this.activeSessions.entries()) {
      if (session.startTime < cutoff && session.status !== 'ACTIVE') {
        this.activeSessions.delete(sessionId);
        cleaned++;
      }
    }

    this.logger.info(`Cleaned up ${cleaned} old sessions`);
    return cleaned;
  }
}

module.exports = { TradingSessionService };
