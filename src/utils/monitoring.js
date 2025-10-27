// Removed unused import to satisfy ESLint (re-add if needed)
// import { securityConfig } from '../config/security';

class MonitoringService {
  constructor() {
    this.events = [];
    this.metrics = {};
    this.enabled = process.env.REACT_APP_ENABLE_TELEMETRY === 'true';
    this.logLevel = process.env.REACT_APP_LOG_LEVEL || 'info';
    this.maxEvents = 1000; // Limit memory usage
  }
  
  // Log levels: error, warn, info, debug
  shouldLog(level) {
    const levels = { error: 0, warn: 1, info: 2, debug: 3 };
    return levels[level] <= levels[this.logLevel];
  }
  
  // Track an event
  trackEvent(eventName, properties = {}, level = 'info') {
    if (!this.shouldLog(level)) return;
    
    const event = {
      name: eventName,
      timestamp: new Date().toISOString(),
      level,
      properties: this.sanitizeProperties(properties),
      sessionId: this.getSessionId(),
      userId: this.getUserId()
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
    
    // Send to analytics service if enabled
    if (this.enabled) {
      this.sendToAnalytics(event);
    }
  }
  
  // Track a metric
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
  }
  
  // Track criterion evaluation
  trackCriterionEvaluation(criterionType, status, confidence, duration) {
    this.trackEvent('criterion_evaluated', {
      type: criterionType,
      status,
      confidence,
      durationMs: duration
    });
    
    // Track metrics
    this.trackMetric(`criterion_${criterionType}_evaluations`, 1);
    this.trackMetric(`criterion_${criterionType}_confidence`, confidence, 'percentage');
    this.trackMetric('evaluation_duration', duration, 'ms');
    
    // Track status distribution
    this.trackMetric(`status_${status}`, 1);
  }
  
  // Track user actions
  trackUserAction(action, details = {}) {
    this.trackEvent('user_action', {
      action,
      ...details,
      timestamp: new Date().toISOString()
    });
  }
  
  // Track errors
  trackError(error, context = {}) {
    this.trackEvent('error', {
      message: error.message,
      stack: error.stack,
      code: error.code,
      context
    }, 'error');
    
    this.trackMetric('errors', 1);
  }
  
  // Track API calls
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
    }
  }
  
  // Track cache performance
  trackCachePerformance(operation, hit, duration) {
    this.trackEvent('cache_operation', {
      operation,
      hit,
      durationMs: duration
    }, 'debug');
    
    this.trackMetric(`cache_${operation}_${hit ? 'hits' : 'misses'}`, 1);
    this.trackMetric(`cache_${operation}_duration`, duration, 'ms');
  }
  
  // Calculate statistics
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
  
  // Sanitize properties to remove PHI
  sanitizeProperties(properties) {
    const sanitized = {};
    const phiFields = ['patientId', 'mrn', 'name', 'dob', 'ssn', 'address', 'phone', 'email'];
    
    for (const [key, value] of Object.entries(properties)) {
      if (phiFields.some(field => key.toLowerCase().includes(field))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        sanitized[key] = value.substring(0, 100) + '...';
      } else {
        sanitized[key] = value;
      }
    }
    
    return sanitized;
  }
  
  // Sanitize endpoint URLs
  sanitizeEndpoint(endpoint) {
    // Remove patient IDs from URLs
    return endpoint
      .replace(/\/Patient\/[^/]+/, '/Patient/[ID]')
      .replace(/\/Observation\/[^/]+/, '/Observation/[ID]')
      .replace(/patient=[^&]+/, 'patient=[ID]')
      .replace(/\b\d{6,}\b/g, '[ID]'); // Remove long number sequences
  }
  
  // Get or create session ID
  getSessionId() {
    let sessionId = sessionStorage.getItem('monitoring_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('monitoring_session_id', sessionId);
    }
    return sessionId;
  }
  
  // Get user ID (sanitized)
  getUserId() {
    // In production, this should be a hashed or anonymous identifier
    return 'anonymous_user';
  }
  
  // Send events to analytics service
  async sendToAnalytics(event) {
    if (!process.env.REACT_APP_ANALYTICS_KEY) return;
    
    try {
      // Implement actual analytics service integration here
      // Example: Google Analytics, Mixpanel, custom service
      
      // For now, just log that we would send
      if (process.env.NODE_ENV === 'development') {
        console.log('Would send to analytics:', event);
      }
    } catch (error) {
      console.error('Failed to send analytics:', error);
    }
  }
  
  // Get current metrics summary
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
  
  // Get recent events
  getRecentEvents(limit = 50, level = null) {
    let events = [...this.events].reverse(); // Most recent first
    
    if (level) {
      events = events.filter(e => e.level === level);
    }
    
    return events.slice(0, limit);
  }
  
  // Export data for debugging
  exportData() {
    return {
      events: this.getRecentEvents(100),
      metrics: this.getMetricsSummary(),
      sessionId: this.getSessionId(),
      timestamp: new Date().toISOString()
    };
  }
  
  // Clear all data
  clear() {
    this.events = [];
    this.metrics = {};
    sessionStorage.removeItem('monitoring_session_id');
  }
}

// Create singleton instance
const monitoring = new MonitoringService();

// Export for use throughout the app
export default monitoring;

// Convenience functions
export const trackEvent = monitoring.trackEvent.bind(monitoring);
export const trackMetric = monitoring.trackMetric.bind(monitoring);
export const trackError = monitoring.trackError.bind(monitoring);
export const trackApiCall = monitoring.trackApiCall.bind(monitoring);
export const trackCriterionEvaluation = monitoring.trackCriterionEvaluation.bind(monitoring);
export const trackUserAction = monitoring.trackUserAction.bind(monitoring);
export const trackCachePerformance = monitoring.trackCachePerformance.bind(monitoring);