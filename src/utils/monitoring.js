// Production monitoring service with persistent logging and alerting

class MonitoringService {
  constructor() {
    this.events = [];
    this.metrics = {};
    this.enabled = process.env.REACT_APP_ENABLE_TELEMETRY !== 'false'; // Default ON
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
    this.maxEvents = 1000; // Limit memory usage
    this.persistenceEnabled = process.env.NODE_ENV === 'production';
    this.logEndpoint = process.env.REACT_APP_LOG_ENDPOINT;
    this.alertEndpoint = process.env.REACT_APP_ALERT_ENDPOINT;
    this.batchSize = 10;
    this.batchBuffer = [];
    this.flushInterval = 30000; // 30 seconds
    
    // Start batch flush timer
    if (this.persistenceEnabled) {
      this.startBatchFlush();
    }
  }
  
  // ========================================
  // LOG LEVELS
  // ========================================
  
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }
  
  // ========================================
  // EVENT TRACKING
  // ========================================
  
  /**
   * Track an event
   * @param {string} eventName - Event name
   * @param {Object} properties - Event properties
   * @param {string} level - Log level (error, warn, info, debug)
   */
  trackEvent(eventName, properties = {}, level = 'info') {
    if (!this.shouldLog(level)) return;
    
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      level,
      properties: this.sanitizeProperties(properties),
      sessionId: this.getSessionId(),
      userId: this.getUserId(),
      environment: process.env.NODE_ENV
    };
    
    // Store locally
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events.shift(); // Remove oldest
    }
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${level.toUpperCase()}] ${eventName}`, properties);
    }
    
    // Add to batch for persistence
    if (this.persistenceEnabled) {
      this.addToBatch(event);
    }
    
    // Check for critical events that need immediate alerting
    if (level === 'error' || this.isCriticalEvent(eventName)) {
      this.sendAlert(event);
    }
  }
  
  // ========================================
  // METRIC TRACKING
  // ========================================
  
  /**
   * Track a metric
   * @param {string} metricName - Metric name
   * @param {number} value - Metric value
   * @param {string} unit - Unit of measurement
   */
  trackMetric(metricName, value, unit = 'count') {
    if (!this.metrics[metricName]) {
      this.metrics[metricName] = {
        values: [],
        unit,
        lastUpdated: null
      };
    }
    
    const metric = this.metrics[metricName];
    metric.values.push({
      value,
      timestamp: new Date().toISOString()
    });
    metric.lastUpdated = new Date().toISOString();
    
    // Keep only last 100 values
    if (metric.values.length > 100) {
      metric.values.shift();
    }
    
    // Calculate statistics
    metric.stats = this.calculateStats(metric.values.map(v => v.value));
    
    // Log significant changes
    if (metric.stats.max === value && metric.values.length > 1) {
      this.trackEvent(`metric_peak_${metricName}`, { value, unit }, 'info');
    }
    
    // Check thresholds
    this.checkThresholds(metricName, value, metric.stats);
  }
  
  // ========================================
  // SPECIALIZED TRACKING
  // ========================================
  
  /**
   * Track criterion evaluation
   */
  trackCriterionEvaluation(criterionType, status, confidence, duration) {
    this.trackEvent('criterion_evaluated', {
      type: criterionType,
      status,
      confidence,
      durationMs: duration
    });
    
    this.trackMetric(`criterion_${criterionType}_evaluations`, 1);
    this.trackMetric(`criterion_${criterionType}_confidence`, confidence, 'percentage');
    this.trackMetric('evaluation_duration', duration, 'ms');
    this.trackMetric(`status_${status}`, 1);
  }
  
  /**
   * Track user action
   */
  trackUserAction(action, details = {}) {
    this.trackEvent('user_action', {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  /**
   * Track error with context
   */
  trackError(error, context = {}) {
    const errorEvent = {
      message: error.message,
      stack: this.sanitizeStack(error.stack),
      code: error.code,
      name: error.name,
      context: this.sanitizeProperties(context)
    };
    
    this.trackEvent('error', errorEvent, 'error');
    this.trackMetric('errors', 1);
    
    // Immediate alert for critical errors
    if (this.isCriticalError(error)) {
      this.sendAlert({
        name: 'critical_error',
        level: 'error',
        properties: errorEvent,
        timestamp: new Date().toISOString()
      });
    }
  }
  
  /**
   * Track API call
   */
  trackApiCall(endpoint, method, duration, status, error = null) {
    this.trackEvent('api_call', {
      endpoint: this.sanitizeEndpoint(endpoint),
      method,
      durationMs: duration,
      status,
      error: error ? error.message : null
    });
    
    this.trackMetric('api_calls', 1);
    this.trackMetric('api_duration', duration, 'ms');
    
    if (status >= 400) {
      this.trackMetric('api_errors', 1);
      
      if (status >= 500) {
        this.trackMetric('api_server_errors', 1);
      }
    }
  }
  
  /**
   * Track cache performance
   */
  trackCachePerformance(operation, hit, duration) {
    this.trackEvent('cache_operation', {
      operation,
      hit,
      durationMs: duration
    }, 'debug');
    
    this.trackMetric(`cache_${operation}_${hit ? 'hits' : 'misses'}`, 1);
    this.trackMetric(`cache_${operation}_duration`, duration, 'ms');
  }
  
  /**
   * Track security event
   */
  trackSecurityEvent(eventType, severity, details = {}) {
    this.trackEvent('security_event', {
      type: eventType,
      severity,
      ...details
    }, severity === 'critical' ? 'error' : 'warn');
    
    if (severity === 'critical') {
      this.sendAlert({
        name: 'security_incident',
        level: 'error',
        properties: { eventType, ...details },
        timestamp: new Date().toISOString()
      });
    }
  }
  
  // ========================================
  // PHI ACCESS TRACKING
  // ========================================
  
  /**
   * Track PHI access (HIPAA requirement)
   */
  trackPHIAccess(action, resourceType, resourceId, userId, purpose) {
    const event = {
      action,
      resourceType,
      resourceId: this.hashId(resourceId), // Hash for audit trail
      userId: this.hashId(userId),
      purpose,
      timestamp: new Date().toISOString(),
      sessionId: this.getSessionId()
    };
    
    this.trackEvent('phi_access', event, 'info');
    
    // Immediately persist PHI access logs
    if (this.persistenceEnabled) {
      this.persistEvent(event, 'phi_audit');
    }
  }
  
  // ========================================
  // PERSISTENCE
  // ========================================
  
  /**
   * Add event to batch buffer
   */
  addToBatch(event) {
    this.batchBuffer.push(event);
    
    if (this.batchBuffer.length >= this.batchSize) {
      this.flushBatch();
    }
  }
  
  /**
   * Flush batch to backend
   */
  async flushBatch() {
    if (this.batchBuffer.length === 0 || !this.logEndpoint) {
      return;
    }
    
    const batch = [...this.batchBuffer];
    this.batchBuffer = [];
    
    try {
      await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Log-Source': 'monitoring-service'
        },
        body: JSON.stringify({
          events: batch,
          batchId: crypto.randomUUID(),
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Failed to flush log batch:', error);
      // Re-add to buffer for retry (up to a limit)
      if (this.batchBuffer.length < this.maxEvents) {
        this.batchBuffer.unshift(...batch);
      }
    }
  }
  
  /**
   * Start periodic batch flush
   */
  startBatchFlush() {
    this.flushTimer = setInterval(() => {
      this.flushBatch();
    }, this.flushInterval);
  }
  
  /**
   * Persist single event immediately
   */
  async persistEvent(event, category = 'general') {
    if (!this.logEndpoint) {
      console.warn('No log endpoint configured');
      return;
    }
    
    try {
      await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Log-Category': category,
          'X-Log-Source': 'monitoring-service'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to persist event:', error);
    }
  }
  
  // ========================================
  // ALERTING
  // ========================================
  
  /**
   * Send immediate alert for critical events
   */
  async sendAlert(event) {
    if (!this.alertEndpoint) {
      console.error('[ALERT]', event.name, event.properties);
      return;
    }
    
    try {
      await fetch(this.alertEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Alert-Priority': event.level === 'error' ? 'high' : 'medium'
        },
        body: JSON.stringify({
          ...event,
          alertId: crypto.randomUUID(),
          source: 'omaxef-pa-app',
          environment: process.env.NODE_ENV
        })
      });
    } catch (error) {
      console.error('Failed to send alert:', error);
    }
  }
  
  /**
   * Check if event requires immediate alert
   */
  isCriticalEvent(eventName) {
    const criticalEvents = [
      'authentication_failure',
      'authorization_failure',
      'phi_breach_detected',
      'data_integrity_violation',
      'security_incident',
      'system_failure'
    ];
    
    return criticalEvents.includes(eventName);
  }
  
  /**
   * Check if error is critical
   */
  isCriticalError(error) {
    const criticalPatterns = [
      /authentication/i,
      /authorization/i,
      /security/i,
      /breach/i,
      /unauthorized/i
    ];
    
    return criticalPatterns.some(pattern => 
      pattern.test(error.message) || pattern.test(error.name)
    );
  }
  
  // ========================================
  // THRESHOLD MONITORING
  // ========================================
  
  /**
   * Check metric against thresholds
   */
  checkThresholds(metricName, value, stats) {
    const thresholds = this.getThresholds(metricName);
    
    if (!thresholds) return;
    
    if (thresholds.critical && value >= thresholds.critical) {
      this.trackEvent(`threshold_critical_${metricName}`, {
        value,
        threshold: thresholds.critical,
        stats
      }, 'error');
    } else if (thresholds.warning && value >= thresholds.warning) {
      this.trackEvent(`threshold_warning_${metricName}`, {
        value,
        threshold: thresholds.warning,
        stats
      }, 'warn');
    }
  }
  
  /**
   * Get thresholds for metric
   */
  getThresholds(metricName) {
    const thresholds = {
      'errors': { warning: 10, critical: 50 },
      'api_errors': { warning: 5, critical: 20 },
      'api_duration': { warning: 3000, critical: 10000 },
      'evaluation_duration': { warning: 1000, critical: 5000 }
    };
    
    return thresholds[metricName];
  }
  
  // ========================================
  // STATISTICS
  // ========================================
  
  /**
   * Calculate statistics for values
   */
  calculateStats(values) {
    if (values.length === 0) return { count: 0 };
    
    const sorted = [...values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    
    return {
      count: values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      mean: sum / values.length,
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
  
  // ========================================
  // SANITIZATION
  // ========================================
  
  /**
   * Sanitize properties to remove PHI
   */
  sanitizeProperties(properties) {
    const sanitized = {};
    const phiFields = ['patientid', 'mrn', 'name', 'dob', 'ssn', 'address', 'phone', 'email'];
    
    for (const [key, value] of Object.entries(properties)) {
      if (phiFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 200) {
        sanitized[key] = value.substring(0, 200) + '...';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeProperties(value); // Recursive
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  /**
   * Sanitize endpoint URLs
   */
  sanitizeEndpoint(endpoint) {
    return endpoint
      .replace(/\/Patient\/[^/]+/g, '/Patient/[ID]')
      .replace(/\/Observation\/[^/]+/g, '/Observation/[ID]')
      .replace(/patient=[^&]+/g, 'patient=[ID]')
      .replace(/\b\d{6,}\b/g, '[ID]');
  }
  
  /**
   * Sanitize stack trace
   */
  sanitizeStack(stack) {
    if (!stack) return null;
    
    // Remove file paths in production
    if (process.env.NODE_ENV === 'production') {
      return stack.split('\n').slice(0, 3).join('\n'); // First 3 lines only
    }
    
    return stack;
  }
  
  /**
   * Hash sensitive ID for audit trail
   */
  hashId(id) {
    if (!id) return null;
    
    const hash = crypto.createHash('sha256');
    hash.update(id.toString());
    return hash.digest('hex').substring(0, 16);
  }
  
  // ========================================
  // SESSION MANAGEMENT
  // ========================================
  
  /**
   * Get or create session ID
   */
  getSessionId() {
    let sessionId = sessionStorage.getItem('monitoring_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('monitoring_session_id', sessionId);
    }
    return sessionId;
  }
  
  /**
   * Get user ID (hashed for privacy)
   */
  getUserId() {
    const userId = sessionStorage.getItem('user_id');
    if (userId) {
      return this.hashId(userId);
    }
    return 'anonymous';
  }
  
  // ========================================
  // DATA RETRIEVAL
  // ========================================
  
  /**
   * Get metrics summary
   */
  getMetricsSummary() {
    const summary = {};
    
    for (const [name, data] of Object.entries(this.metrics)) {
      summary[name] = {
        ...data.stats,
        unit: data.unit,
        lastUpdated: data.lastUpdated
      };
    }
    
    return summary;
  }
  
  /**
   * Get recent events
   */
  getRecentEvents(limit = 50, level = null) {
    let events = [...this.events].reverse();
    
    if (level) {
      events = events.filter(e => e.level === level);
    }
    
    return events.slice(0, limit);
  }
  
  /**
   * Export data for debugging
   */
  exportData() {
    return {
      events: this.getRecentEvents(100),
      metrics: this.getMetricsSummary(),
      sessionId: this.getSessionId(),
      environment: process.env.NODE_ENV,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Clear all data (dev only)
   */
  clear() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear monitoring data in production');
    }
    
    this.events = [];
    this.metrics = {};
    sessionStorage.removeItem('monitoring_session_id');
  }
  
  // ========================================
  // CLEANUP
  // ========================================
  
  /**
   * Cleanup on unmount
   */
  destroy() {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushBatch(); // Final flush
    }
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

// Export for use throughout the app
export default monitoring;

// Convenience exports
export const trackEvent = monitoring.trackEvent.bind(monitoring);
export const trackMetric = monitoring.trackMetric.bind(monitoring);
export const trackError = monitoring.trackError.bind(monitoring);
export const trackApiCall = monitoring.trackApiCall.bind(monitoring);
export const trackCriterionEvaluation = monitoring.trackCriterionEvaluation.bind(monitoring);
export const trackUserAction = monitoring.trackUserAction.bind(monitoring);
export const trackCachePerformance = monitoring.trackCachePerformance.bind(monitoring);
export const trackSecurityEvent = monitoring.trackSecurityEvent.bind(monitoring);
export const trackPHIAccess = monitoring.trackPHIAccess.bind(monitoring);