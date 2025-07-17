/**
 * 📊 Performance Monitor - Context7 Optimized
 * 
 * Context7 Pattern: Comprehensive Performance Monitoring System
 * - Request performance tracking
 * - Resource usage monitoring
 * - Performance metrics collection
 * - Bottleneck detection
 */

class PerformanceMonitor {
  constructor() {
    this.activeMonitors = new Map();
    this.metrics = {
      requests: [],
      resources: [],
      errors: []
    };
    this.maxMetrics = 1000; // Keep last 1000 metrics
  }

  /**
   * Context7 Pattern: Start monitoring a request
   */
  startMonitoring(requestId) {
    const monitor = {
      requestId,
      startTime: Date.now(),
      startCpuUsage: process.cpuUsage(),
      startMemoryUsage: process.memoryUsage(),
      markers: []
    };

    this.activeMonitors.set(requestId, monitor);
    
    return {
      addMarker: (name, data = {}) => this.addMarker(requestId, name, data),
      finish: () => this.finishMonitoring(requestId),
      getMetrics: () => this.getMonitorMetrics(requestId)
    };
  }

  /**
   * Context7 Pattern: Add performance marker
   */
  addMarker(requestId, name, data = {}) {
    const monitor = this.activeMonitors.get(requestId);
    if (!monitor) return;

    monitor.markers.push({
      name,
      timestamp: Date.now(),
      elapsedTime: Date.now() - monitor.startTime,
      data
    });
  }

  /**
   * Context7 Pattern: Finish monitoring and collect metrics
   */
  finishMonitoring(requestId) {
    const monitor = this.activeMonitors.get(requestId);
    if (!monitor) return null;

    const endTime = Date.now();
    const endCpuUsage = process.cpuUsage(monitor.startCpuUsage);
    const endMemoryUsage = process.memoryUsage();

    const metrics = {
      requestId,
      duration: endTime - monitor.startTime,
      cpuUsage: {
        user: endCpuUsage.user / 1000, // Convert to milliseconds
        system: endCpuUsage.system / 1000
      },
      memoryUsage: {
        heapUsed: endMemoryUsage.heapUsed - monitor.startMemoryUsage.heapUsed,
        heapTotal: endMemoryUsage.heapTotal - monitor.startMemoryUsage.heapTotal,
        rss: endMemoryUsage.rss - monitor.startMemoryUsage.rss,
        external: endMemoryUsage.external - monitor.startMemoryUsage.external
      },
      markers: monitor.markers,
      timestamp: endTime
    };

    // Store metrics
    this.metrics.requests.push(metrics);
    
    // Keep only recent metrics
    if (this.metrics.requests.length > this.maxMetrics) {
      this.metrics.requests.shift();
    }

    // Remove active monitor
    this.activeMonitors.delete(requestId);

    return metrics;
  }

  /**
   * Context7 Pattern: Get current monitor metrics
   */
  getMonitorMetrics(requestId) {
    const monitor = this.activeMonitors.get(requestId);
    if (!monitor) return null;

    const currentTime = Date.now();
    const currentCpuUsage = process.cpuUsage(monitor.startCpuUsage);
    const currentMemoryUsage = process.memoryUsage();

    return {
      requestId,
      duration: currentTime - monitor.startTime,
      cpuUsage: {
        user: currentCpuUsage.user / 1000,
        system: currentCpuUsage.system / 1000
      },
      memoryUsage: {
        heapUsed: currentMemoryUsage.heapUsed - monitor.startMemoryUsage.heapUsed,
        heapTotal: currentMemoryUsage.heapTotal - monitor.startMemoryUsage.heapTotal,
        rss: currentMemoryUsage.rss - monitor.startMemoryUsage.rss,
        external: currentMemoryUsage.external - monitor.startMemoryUsage.external
      },
      markers: monitor.markers,
      active: true
    };
  }

  /**
   * Context7 Pattern: Record resource usage
   */
  recordResourceUsage(type, usage) {
    const resourceMetric = {
      type,
      usage,
      timestamp: Date.now(),
      processInfo: {
        pid: process.pid,
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        cpuUsage: process.cpuUsage()
      }
    };

    this.metrics.resources.push(resourceMetric);
    
    // Keep only recent metrics
    if (this.metrics.resources.length > this.maxMetrics) {
      this.metrics.resources.shift();
    }

    return resourceMetric;
  }

  /**
   * Context7 Pattern: Record performance error
   */
  recordError(error, context = {}) {
    const errorMetric = {
      error: {
        message: error.message,
        stack: error.stack,
        name: error.name,
        code: error.code
      },
      context,
      timestamp: Date.now(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };

    this.metrics.errors.push(errorMetric);
    
    // Keep only recent metrics
    if (this.metrics.errors.length > this.maxMetrics) {
      this.metrics.errors.shift();
    }

    return errorMetric;
  }

  /**
   * Context7 Pattern: Get performance statistics
   */
  getStatistics(timeRange = 300000) { // 5 minutes default
    const now = Date.now();
    const cutoff = now - timeRange;

    // Filter metrics by time range
    const recentRequests = this.metrics.requests.filter(m => m.timestamp > cutoff);
    const recentResources = this.metrics.resources.filter(m => m.timestamp > cutoff);
    const recentErrors = this.metrics.errors.filter(m => m.timestamp > cutoff);

    if (recentRequests.length === 0) {
      return {
        timeRange,
        requestCount: 0,
        statistics: null
      };
    }

    // Calculate request statistics
    const durations = recentRequests.map(r => r.duration);
    const cpuUsages = recentRequests.map(r => r.cpuUsage.user + r.cpuUsage.system);
    const memoryUsages = recentRequests.map(r => r.memoryUsage.heapUsed);

    const statistics = {
      timeRange,
      requestCount: recentRequests.length,
      errorCount: recentErrors.length,
      errorRate: recentErrors.length / recentRequests.length,
      duration: {
        min: Math.min(...durations),
        max: Math.max(...durations),
        avg: durations.reduce((a, b) => a + b, 0) / durations.length,
        median: this.calculateMedian(durations),
        p95: this.calculatePercentile(durations, 95),
        p99: this.calculatePercentile(durations, 99)
      },
      cpuUsage: {
        min: Math.min(...cpuUsages),
        max: Math.max(...cpuUsages),
        avg: cpuUsages.reduce((a, b) => a + b, 0) / cpuUsages.length
      },
      memoryUsage: {
        min: Math.min(...memoryUsages),
        max: Math.max(...memoryUsages),
        avg: memoryUsages.reduce((a, b) => a + b, 0) / memoryUsages.length
      },
      throughput: recentRequests.length / (timeRange / 1000), // requests per second
      activeMonitors: this.activeMonitors.size
    };

    return statistics;
  }

  /**
   * Context7 Pattern: Get slow requests
   */
  getSlowRequests(threshold = 1000, limit = 10) {
    return this.metrics.requests
      .filter(r => r.duration > threshold)
      .sort((a, b) => b.duration - a.duration)
      .slice(0, limit)
      .map(r => ({
        requestId: r.requestId,
        duration: r.duration,
        cpuUsage: r.cpuUsage,
        memoryUsage: r.memoryUsage.heapUsed,
        markers: r.markers,
        timestamp: r.timestamp
      }));
  }

  /**
   * Context7 Pattern: Get memory leaks detection
   */
  detectMemoryLeaks(threshold = 50 * 1024 * 1024) { // 50MB
    const recentRequests = this.metrics.requests.slice(-100); // Last 100 requests
    
    if (recentRequests.length < 10) {
      return { detected: false, reason: 'Insufficient data' };
    }

    const memoryTrend = recentRequests.map(r => r.memoryUsage.heapUsed);
    const avgMemoryIncrease = memoryTrend.reduce((acc, curr, index) => {
      if (index === 0) return 0;
      return acc + (curr - memoryTrend[index - 1]);
    }, 0) / (memoryTrend.length - 1);

    const detected = avgMemoryIncrease > threshold;
    
    return {
      detected,
      avgMemoryIncrease,
      threshold,
      recentMemoryUsage: memoryTrend.slice(-10),
      recommendation: detected ? 'Memory usage is consistently increasing. Check for memory leaks.' : null
    };
  }

  /**
   * Context7 Pattern: Get performance bottlenecks
   */
  getBottlenecks(limit = 5) {
    const markerStats = new Map();
    
    // Analyze markers across all requests
    this.metrics.requests.forEach(request => {
      request.markers.forEach(marker => {
        if (!markerStats.has(marker.name)) {
          markerStats.set(marker.name, {
            name: marker.name,
            count: 0,
            totalTime: 0,
            maxTime: 0,
            minTime: Infinity
          });
        }
        
        const stats = markerStats.get(marker.name);
        stats.count++;
        stats.totalTime += marker.elapsedTime;
        stats.maxTime = Math.max(stats.maxTime, marker.elapsedTime);
        stats.minTime = Math.min(stats.minTime, marker.elapsedTime);
      });
    });

    // Calculate averages and sort by average time
    const bottlenecks = Array.from(markerStats.values())
      .map(stats => ({
        ...stats,
        avgTime: stats.totalTime / stats.count,
        minTime: stats.minTime === Infinity ? 0 : stats.minTime
      }))
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit);

    return bottlenecks;
  }

  /**
   * Context7 Pattern: Export performance data
   */
  exportData(format = 'json') {
    const data = {
      metadata: {
        exportTime: new Date().toISOString(),
        activeMonitors: this.activeMonitors.size,
        totalRequests: this.metrics.requests.length,
        totalResources: this.metrics.resources.length,
        totalErrors: this.metrics.errors.length
      },
      metrics: {
        requests: this.metrics.requests,
        resources: this.metrics.resources,
        errors: this.metrics.errors
      },
      statistics: this.getStatistics()
    };

    switch (format) {
      case 'csv':
        return this.convertToCSV(data);
      case 'json':
      default:
        return JSON.stringify(data, null, 2);
    }
  }

  /**
   * Context7 Pattern: Clear metrics
   */
  clearMetrics() {
    this.metrics = {
      requests: [],
      resources: [],
      errors: []
    };
  }

  /**
   * Context7 Pattern: Get active monitors
   */
  getActiveMonitors() {
    const monitors = [];
    
    for (const [requestId, monitor] of this.activeMonitors.entries()) {
      monitors.push({
        requestId,
        duration: Date.now() - monitor.startTime,
        markers: monitor.markers.length,
        startTime: monitor.startTime
      });
    }

    return monitors;
  }

  // Helper methods

  /**
   * Calculate median value
   */
  calculateMedian(values) {
    const sorted = values.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? 
      (sorted[mid - 1] + sorted[mid]) / 2 : 
      sorted[mid];
  }

  /**
   * Calculate percentile value
   */
  calculatePercentile(values, percentile) {
    const sorted = values.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
  }

  /**
   * Convert data to CSV format
   */
  convertToCSV(data) {
    const requests = data.metrics.requests.map(r => ({
      requestId: r.requestId,
      duration: r.duration,
      cpuUser: r.cpuUsage.user,
      cpuSystem: r.cpuUsage.system,
      memoryHeap: r.memoryUsage.heapUsed,
      timestamp: new Date(r.timestamp).toISOString()
    }));

    if (requests.length === 0) return '';

    const headers = Object.keys(requests[0]).join(',');
    const rows = requests.map(r => Object.values(r).join(','));
    
    return [headers, ...rows].join('\n');
  }
}

module.exports = { PerformanceMonitor };