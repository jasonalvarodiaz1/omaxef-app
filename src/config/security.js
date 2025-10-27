// Security configuration for the application
export const securityConfig = {
  // PHI handling configuration
  phi: {
    enableRedaction: process.env.REACT_APP_ENABLE_PHI_REDACTION === 'true',
    redactionLevel: process.env.REACT_APP_PHI_REDACTION_LEVEL || 'standard',
    auditLogging: process.env.REACT_APP_ENABLE_AUDIT_LOGGING === 'true'
  },
  
  // Session management
  session: {
    timeoutMinutes: parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || '30', 10),
    warningMinutes: 5,
    requireHttps: process.env.REACT_APP_REQUIRE_HTTPS === 'true'
  },
  
  // API security
  api: {
    requireAuth: true,
    maxRetries: 3,
    timeoutMs: 30000
  },
  
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'"], // Remove unsafe-inline in production
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: ["'self'", process.env.REACT_APP_FHIR_SERVER_URL, process.env.REACT_APP_TOKEN_EXCHANGE_URL].filter(Boolean),
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"]
  },
  
  // Allowed domains for CORS
  allowedOrigins: [
    'http://localhost:3000',
    'http://localhost:3001'
  ],
  
  // Headers to include in requests
  securityHeaders: {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=()'
  }
};

// Validate security configuration on load
export function validateSecurityConfig() {
  const warnings = [];
  const errors = [];
  
  // Check for development settings in production
  if (process.env.NODE_ENV === 'production') {
    if (!securityConfig.session.requireHttps) {
      errors.push('HTTPS must be required in production');
    }
    
    if (securityConfig.csp.scriptSrc.includes("'unsafe-inline'")) {
      warnings.push("CSP contains 'unsafe-inline' for scripts");
    }
    
    if (!process.env.REACT_APP_FHIR_CLIENT_ID || process.env.REACT_APP_FHIR_CLIENT_ID.includes('your_')) {
      errors.push('Production FHIR client ID not configured');
    }
  }
  
  // Check for missing security features
  if (!securityConfig.phi.enableRedaction) {
    warnings.push('PHI redaction is disabled');
  }
  
  if (!securityConfig.phi.auditLogging) {
    warnings.push('Audit logging is disabled');
  }
  
  return { warnings, errors };
}

// Apply security headers to fetch requests
export function applySecurityHeaders(headers = {}) {
  return {
    ...headers,
    ...securityConfig.securityHeaders
  };
}

// Check if a URL is allowed for CORS
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  
  if (process.env.NODE_ENV === 'development') {
    // More permissive in development
    return securityConfig.allowedOrigins.some(allowed => 
      origin.startsWith(allowed)
    );
  }
  
  // Strict matching in production
  return securityConfig.allowedOrigins.includes(origin);
}

// Session timeout management
let sessionTimer = null;
let warningTimer = null;

export function startSessionTimer(onTimeout, onWarning) {
  clearSessionTimers();
  
  const timeoutMs = securityConfig.session.timeoutMinutes * 60 * 1000;
  const warningMs = (securityConfig.session.timeoutMinutes - securityConfig.session.warningMinutes) * 60 * 1000;
  
  if (onWarning && warningMs > 0) {
    warningTimer = setTimeout(onWarning, warningMs);
  }
  
  sessionTimer = setTimeout(onTimeout, timeoutMs);
}

export function clearSessionTimers() {
  if (sessionTimer) {
    clearTimeout(sessionTimer);
    sessionTimer = null;
  }
  if (warningTimer) {
    clearTimeout(warningTimer);
    warningTimer = null;
  }
}

export function resetSessionTimer(onTimeout, onWarning) {
  startSessionTimer(onTimeout, onWarning);
}