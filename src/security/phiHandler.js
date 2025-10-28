// PHI redaction and audit logging service with production compliance
import crypto from 'crypto';

export class PHIHandler {
  constructor(options = {}) {
    this.auditLog = [];
    this.persistenceEnabled = options.persistenceEnabled || process.env.NODE_ENV === 'production';
    this.auditEndpoint = options.auditEndpoint || process.env.REACT_APP_AUDIT_ENDPOINT;
    this.baaVerified = options.baaVerified || false;
    this.maxInMemoryLogs = 500;
  }

  // ========================================
  // PHI REDACTION
  // ========================================
  
  /**
   * Redact sensitive identifiers from FHIR data
   * @param {Object} fhirResource - FHIR resource to redact
   * @param {Object} options - Redaction options (userId, purpose, service)
   * @returns {Object} - { redacted, redactionMap, auditId }
   */
  redactPHI(fhirResource, options = {}) {
    if (!fhirResource) {
      throw new Error('FHIR resource is required for redaction');
    }
    
    const redacted = JSON.parse(JSON.stringify(fhirResource));
    const redactionMap = new Map();
    
    // Generate consistent pseudo-IDs for tracking
    const getPseudoId = (original) => {
      if (!redactionMap.has(original)) {
        redactionMap.set(original, crypto.randomBytes(8).toString('hex'));
      }
      return redactionMap.get(original);
    };
    
    // Redact patient identifiers
    if (redacted.patient?.reference) {
      redacted.patient.reference = `Patient/${getPseudoId(redacted.patient.reference)}`;
    }
    
    if (redacted.subject?.reference) {
      redacted.subject.reference = `Patient/${getPseudoId(redacted.subject.reference)}`;
    }
    
    // Redact names
    if (redacted.name) {
      redacted.name = redacted.name.map(n => ({
        ...n,
        given: ['[REDACTED]'],
        family: '[REDACTED]',
        text: '[REDACTED]'
      }));
    }
    
    // Redact MRNs and other identifiers
    if (redacted.identifier) {
      redacted.identifier = redacted.identifier.map(id => ({
        ...id,
        value: getPseudoId(id.value)
      }));
    }
    
    // Redact addresses
    if (redacted.address) {
      redacted.address = redacted.address.map(addr => ({
        use: addr.use,
        type: addr.type,
        city: '[REDACTED]',
        state: addr.state, // Keep state for clinical relevance
        postalCode: addr.postalCode?.substring(0, 3) + 'XX', // Keep first 3 digits
        country: addr.country
      }));
    }
    
    // Redact telecom (phone, email)
    if (redacted.telecom) {
      redacted.telecom = redacted.telecom.map(t => ({
        ...t,
        value: '[REDACTED]'
      }));
    }
    
    // Redact dates of birth (keep year for age calculation)
    if (redacted.birthDate) {
      const birthYear = redacted.birthDate.substring(0, 4);
      redacted.birthDate = `${birthYear}-01-01`;
    }
    
    // Redact text fields that might contain PHI
    if (redacted.text?.div) {
      redacted.text.div = '<div>[REDACTED]</div>';
    }
    
    // Audit the redaction
    const auditEntry = this.logAccess({
      action: 'REDACT',
      resourceType: redacted.resourceType,
      resourceId: getPseudoId(fhirResource.id || 'unknown'),
      timestamp: new Date().toISOString(),
      user: options.userId || 'system',
      purpose: options.purpose || 'PA_EVALUATION',
      service: options.service || 'internal',
      fieldsRedacted: Array.from(redactionMap.keys()).length
    });
    
    return { 
      redacted, 
      redactionMap,
      auditId: auditEntry.id
    };
  }
  
  // ========================================
  // EXTERNAL SERVICE GATE
  // ========================================
  
  /**
   * Verify BAA compliance before sending data to external service
   * @param {string} serviceName - Name of external service
   * @param {Object} data - Data to be sent
   * @param {Object} options - Options (userId, purpose)
   * @returns {Object} - { allowed, reason, sanitizedData }
   */
  verifyExternalServiceCompliance(serviceName, data, options = {}) {
    const result = {
      allowed: false,
      reason: '',
      sanitizedData: null
    };
    
    // Check if BAA is in place
    if (!this.baaVerified) {
      result.reason = 'No Business Associate Agreement (BAA) verified for external service';
      this.logAccess({
        action: 'EXTERNAL_SERVICE_BLOCKED',
        service: serviceName,
        reason: 'BAA_NOT_VERIFIED',
        user: options.userId,
        timestamp: new Date().toISOString()
      });
      return result;
    }
    
    // Check if service is in allowlist
    const allowedServices = (process.env.REACT_APP_BAA_APPROVED_SERVICES || '').split(',');
    if (!allowedServices.includes(serviceName)) {
      result.reason = `Service ${serviceName} not in BAA-approved allowlist`;
      this.logAccess({
        action: 'EXTERNAL_SERVICE_BLOCKED',
        service: serviceName,
        reason: 'NOT_IN_ALLOWLIST',
        user: options.userId,
        timestamp: new Date().toISOString()
      });
      return result;
    }
    
    // Redact PHI before sending
    try {
      const { redacted, auditId } = this.redactPHI(data, {
        ...options,
        service: serviceName
      });
      
      result.allowed = true;
      result.sanitizedData = redacted;
      result.reason = `Data sanitized for ${serviceName} (audit: ${auditId})`;
      
      this.logAccess({
        action: 'EXTERNAL_SERVICE_APPROVED',
        service: serviceName,
        auditId,
        user: options.userId,
        timestamp: new Date().toISOString()
      });
      
      return result;
    } catch (error) {
      result.reason = `Redaction failed: ${error.message}`;
      this.logAccess({
        action: 'EXTERNAL_SERVICE_BLOCKED',
        service: serviceName,
        reason: 'REDACTION_FAILED',
        error: error.message,
        user: options.userId,
        timestamp: new Date().toISOString()
      });
      return result;
    }
  }
  
  // ========================================
  // AUDIT LOGGING
  // ========================================
  
  /**
   * Secure audit logging with persistence
   * @param {Object} entry - Audit log entry
   * @returns {Object} - Audit entry with ID and hash
   */
  logAccess(entry) {
    const auditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      hash: this.generateHash(entry),
      environment: process.env.NODE_ENV || 'unknown'
    };
    
    // Store in memory
    this.auditLog.push(auditEntry);
    
    // Limit memory usage
    if (this.auditLog.length > this.maxInMemoryLogs) {
      this.auditLog.shift();
    }
    
    // Persist to backend in production
    if (this.persistenceEnabled) {
      this.persistAuditLog(auditEntry).catch(error => {
        console.error('Failed to persist audit log:', error);
        // In production, this should trigger an alert
      });
    }
    
    return auditEntry;
  }
  
  /**
   * Persist audit log to backend
   * @param {Object} entry - Audit entry
   */
  async persistAuditLog(entry) {
    if (!this.auditEndpoint) {
      console.warn('⚠️  No audit endpoint configured - logs not persisted');
      return;
    }
    
    try {
      const response = await fetch(this.auditEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Audit-Source': 'phi-handler'
        },
        body: JSON.stringify(entry)
      });
      
      if (!response.ok) {
        throw new Error(`Audit persistence failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Audit persistence error:', error);
      throw error;
    }
  }
  
  /**
   * Generate hash for audit entry integrity
   * @param {Object} data - Data to hash
   * @returns {string} - SHA-256 hash
   */
  generateHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
  
  // ========================================
  // AUDIT RETRIEVAL
  // ========================================
  
  /**
   * Get audit logs (with filtering)
   * @param {Object} filters - Filter options (action, user, startDate, endDate)
   * @param {number} limit - Maximum number of logs to return
   * @returns {Array} - Filtered audit logs
   */
  getAuditLogs(filters = {}, limit = 100) {
    let logs = [...this.auditLog];
    
    // Apply filters
    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }
    
    if (filters.user) {
      logs = logs.filter(log => log.user === filters.user);
    }
    
    if (filters.startDate) {
      logs = logs.filter(log => new Date(log.timestamp) >= new Date(filters.startDate));
    }
    
    if (filters.endDate) {
      logs = logs.filter(log => new Date(log.timestamp) <= new Date(filters.endDate));
    }
    
    // Return most recent first
    return logs.reverse().slice(0, limit);
  }
  
  /**
   * Get audit statistics
   * @returns {Object} - Statistics about audit logs
   */
  getAuditStats() {
    const stats = {
      totalLogs: this.auditLog.length,
      actionCounts: {},
      userCounts: {},
      recentActivity: []
    };
    
    this.auditLog.forEach(log => {
      stats.actionCounts[log.action] = (stats.actionCounts[log.action] || 0) + 1;
      stats.userCounts[log.user] = (stats.userCounts[log.user] || 0) + 1;
    });
    
    stats.recentActivity = this.auditLog.slice(-10).reverse();
    
    return stats;
  }
  
  /**
   * Clear audit logs (use with caution)
   */
  clearAuditLogs() {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Cannot clear audit logs in production');
    }
    this.auditLog = [];
  }
}

// ========================================
// SINGLETON INSTANCE
// ========================================
const phiHandler = new PHIHandler({
  persistenceEnabled: process.env.NODE_ENV === 'production',
  auditEndpoint: process.env.REACT_APP_AUDIT_ENDPOINT,
  baaVerified: process.env.REACT_APP_BAA_VERIFIED === 'true'
});

export default phiHandler;