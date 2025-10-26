// PHI redaction and audit logging service
import crypto from 'crypto';

export class PHIHandler {
  constructor() {
    this.auditLog = [];
  }

  // Redact sensitive identifiers from FHIR data
  redactPHI(fhirResource, options = {}) {
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
    
    // Redact names
    if (redacted.name) {
      redacted.name = redacted.name.map(n => ({
        ...n,
        given: ['[REDACTED]'],
        family: '[REDACTED]'
      }));
    }
    
    // Redact MRNs and other identifiers
    if (redacted.identifier) {
      redacted.identifier = redacted.identifier.map(id => ({
        ...id,
        value: getPseudoId(id.value)
      }));
    }
    
    // Audit the redaction
    this.logAccess({
      action: 'REDACT',
      resourceType: redacted.resourceType,
      timestamp: new Date().toISOString(),
      user: options.userId,
      purpose: options.purpose || 'PA_EVALUATION'
    });
    
    return { redacted, redactionMap };
  }
  
  // Secure audit logging
  logAccess(entry) {
    const auditEntry = {
      ...entry,
      id: crypto.randomUUID(),
      hash: this.generateHash(entry)
    };
    
    this.auditLog.push(auditEntry);
    
    // In production, also send to:
    // - Persistent audit database
    // - SIEM system
    // - Compliance reporting service
    
    return auditEntry;
  }
  
  generateHash(data) {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }
}
