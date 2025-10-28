import monitoring, {
  trackEvent,
  trackMetric,
  trackError,
  trackCriterionEvaluation
} from './monitoring';

describe('Monitoring Service', () => {
  beforeEach(() => {
    monitoring.clear();
  });

  describe('Event tracking', () => {
    it('should track events with sanitized properties', () => {
      trackEvent('test_event', {
        action: 'button_click',
        patientId: '12345', // Should be redacted
        value: 'safe_value'
      });

      const events = monitoring.getRecentEvents(10);
      expect(events).toHaveLength(1);
      expect(events[0].name).toBe('test_event');
      expect(events[0].properties.patientId).toBe('[REDACTED]');
      expect(events[0].properties.value).toBe('safe_value');
    });

    it('should include session and user ID', () => {
      trackEvent('test_event', {});

      const events = monitoring.getRecentEvents(1);
      expect(events[0].sessionId).toBeDefined();
      expect(events[0].userId).toBeDefined();
    });

    it('should respect log level filtering', () => {
      // Suppress expected console.error from alerts
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      // Clear any previous events
      monitoring.clear();
      
      // Set log level to 'warn' (only errors and warnings)
      const originalLogLevel = process.env.REACT_APP_LOG_LEVEL;
      process.env.REACT_APP_LOG_LEVEL = 'warn';
      
      // Need to reinitialize the monitoring service with new log level
      monitoring.logLevel = 'warn';

      trackEvent('debug_event', {}, 'debug'); // Should not be logged
      trackEvent('info_event', {}, 'info');   // Should not be logged
      trackEvent('warn_event', {}, 'warn');   // Should be logged
      trackEvent('error_event', {}, 'error'); // Should be logged

      const events = monitoring.getRecentEvents(10);
      expect(events.length).toBe(2); // Exactly warn and error

      // Reset
      process.env.REACT_APP_LOG_LEVEL = originalLogLevel || 'info';
      monitoring.logLevel = originalLogLevel || 'info';
      consoleErrorSpy.mockRestore();
    });

    it('should limit event storage to prevent memory issues', () => {
      // Track more than max events
      for (let i = 0; i < 1100; i++) {
        trackEvent('test_event', { index: i });
      }

      const events = monitoring.getRecentEvents(2000);
      expect(events.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('Metric tracking', () => {
    it('should track and calculate metric statistics', () => {
      trackMetric('test_metric', 10);
      trackMetric('test_metric', 20);
      trackMetric('test_metric', 30);

      const summary = monitoring.getMetricsSummary();
      expect(summary.test_metric).toBeDefined();
      expect(summary.test_metric.count).toBe(3);
      expect(summary.test_metric.min).toBe(10);
      expect(summary.test_metric.max).toBe(30);
      expect(summary.test_metric.mean).toBe(20);
    });

    it('should track metric peak values', () => {
      trackMetric('response_time', 100, 'ms');
      trackMetric('response_time', 500, 'ms'); // Peak

      const events = monitoring.getRecentEvents(10);
      const peakEvent = events.find(e => e.name === 'metric_peak_response_time');
      expect(peakEvent).toBeDefined();
      expect(peakEvent.properties.value).toBe(500);
    });

    it('should limit metric value storage', () => {
      for (let i = 0; i < 150; i++) {
        trackMetric('test_metric', i);
      }

      const summary = monitoring.getMetricsSummary();
      expect(summary.test_metric.count).toBeLessThanOrEqual(100);
    });
  });

  describe('Criterion evaluation tracking', () => {
    it('should track criterion evaluation with all details', () => {
      trackCriterionEvaluation('bmi', 'MET', 0.95, 250);

      const events = monitoring.getRecentEvents(10);
      const criterionEvent = events.find(e => e.name === 'criterion_evaluated');
      
      expect(criterionEvent).toBeDefined();
      expect(criterionEvent.properties.type).toBe('bmi');
      expect(criterionEvent.properties.status).toBe('MET');
      expect(criterionEvent.properties.confidence).toBe(0.95);
      expect(criterionEvent.properties.durationMs).toBe(250);
    });

    it('should track metrics for evaluation counts and confidence', () => {
      trackCriterionEvaluation('bmi', 'MET', 0.9, 100);
      trackCriterionEvaluation('bmi', 'MET', 0.8, 150);

      const summary = monitoring.getMetricsSummary();
      expect(summary['criterion_bmi_evaluations']).toBeDefined();
      expect(summary['criterion_bmi_evaluations'].count).toBe(2);
      expect(summary['criterion_bmi_confidence']).toBeDefined();
    });

    it('should track status distribution', () => {
      trackCriterionEvaluation('bmi', 'MET', 0.9, 100);
      trackCriterionEvaluation('doseProgression', 'NOT_MET', 0.8, 100);
      trackCriterionEvaluation('documentation', 'MET', 0.95, 100);

      const summary = monitoring.getMetricsSummary();
      expect(summary.status_MET).toBeDefined();
      expect(summary.status_MET.count).toBe(2);
      expect(summary.status_NOT_MET).toBeDefined();
      expect(summary.status_NOT_MET.count).toBe(1);
    });
  });

  describe('Error tracking', () => {
    it('should track errors with context', () => {
      // Suppress expected console.error from alert
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      const error = new Error('Test error');
      error.code = 'TEST_ERROR';

      trackError(error, {
        operation: 'evaluation',
        criterionType: 'bmi'
      });

      const events = monitoring.getRecentEvents(10, 'error');
      expect(events).toHaveLength(1);
      expect(events[0].properties.message).toBe('Test error');
      expect(events[0].properties.code).toBe('TEST_ERROR');
      expect(events[0].properties.context.operation).toBe('evaluation');
      
      consoleErrorSpy.mockRestore();
    });

    it('should increment error metric', () => {
      // Suppress expected console.error from alerts
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      trackError(new Error('Error 1'));
      trackError(new Error('Error 2'));

      const summary = monitoring.getMetricsSummary();
      expect(summary.errors).toBeDefined();
      expect(summary.errors.count).toBe(2);
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('PHI sanitization', () => {
    it('should redact PHI fields from events', () => {
      trackEvent('patient_view', {
        patientId: 'P12345',
        mrn: 'MRN-98765',
        name: 'John Doe',
        dob: '1980-01-01',
        diagnosis: 'Diabetes', // Not PHI
        clinician: 'Dr. Smith'
      });

      const events = monitoring.getRecentEvents(1);
      expect(events[0].properties.patientId).toBe('[REDACTED]');
      expect(events[0].properties.mrn).toBe('[REDACTED]');
      expect(events[0].properties.name).toBe('[REDACTED]');
      expect(events[0].properties.dob).toBe('[REDACTED]');
      expect(events[0].properties.diagnosis).toBe('Diabetes');
      expect(events[0].properties.clinician).toBe('Dr. Smith');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(250);
      trackEvent('test', { longValue: longString });

      const events = monitoring.getRecentEvents(1);
      expect(events[0].properties.longValue.length).toBeLessThanOrEqual(203); // 200 + '...'
    });

    it('should sanitize endpoint URLs', () => {
      const endpoint = 'https://api.example.com/Patient/12345/Observation/67890';
      const sanitized = monitoring.sanitizeEndpoint(endpoint);

      expect(sanitized).not.toContain('12345');
      expect(sanitized).not.toContain('67890');
      expect(sanitized).toContain('[ID]');
    });
  });

  describe('Session management', () => {
    it('should create and reuse session ID', () => {
      const sessionId1 = monitoring.getSessionId();
      const sessionId2 = monitoring.getSessionId();

      expect(sessionId1).toBe(sessionId2);
      expect(sessionId1).toMatch(/^session_\d+_[a-z0-9]+$/);
    });

    it('should clear session on clear()', () => {
      const oldSessionId = monitoring.getSessionId();
      monitoring.clear();
      const newSessionId = monitoring.getSessionId();

      expect(oldSessionId).not.toBe(newSessionId);
    });
  });

  describe('Data export', () => {
    it('should export monitoring data', () => {
      // Suppress expected console.error from alert
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      
      trackEvent('event1', { test: 'value' });
      trackMetric('metric1', 100);
      trackError(new Error('Test error'));

      const exported = monitoring.exportData();

      expect(exported.events).toBeInstanceOf(Array);
      expect(exported.metrics).toBeDefined();
      expect(exported.sessionId).toBeDefined();
      expect(exported.timestamp).toBeDefined();
      
      consoleErrorSpy.mockRestore();
    });

    it('should limit exported events', () => {
      for (let i = 0; i < 200; i++) {
        trackEvent('test', { index: i });
      }

      const exported = monitoring.exportData();
      expect(exported.events.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Telemetry toggle', () => {
    it('should respect ENABLE_TELEMETRY flag', () => {
      const originalValue = process.env.REACT_APP_ENABLE_TELEMETRY;
      
      // Disable telemetry
      process.env.REACT_APP_ENABLE_TELEMETRY = 'false';
      
      trackEvent('test_event', {});
      
      // Events should still be tracked locally for debugging
      const events = monitoring.getRecentEvents(10);
      expect(events.length).toBeGreaterThan(0);
      
      // Restore original value
      process.env.REACT_APP_ENABLE_TELEMETRY = originalValue;
    });
  });
});