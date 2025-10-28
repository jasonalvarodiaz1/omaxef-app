// Production security configuration with HIPAA compliance controls

export const securityConfig = {
  // PHI handling configuration
  phi: {
    enableRedaction: process.env.REACT_APP_ENABLE_PHI_REDACTION !== 'false', // Default ON
    redactionLevel: process.env.REACT_APP_PHI_REDACTION_LEVEL || 'strict', // strict, standard, minimal
    auditLogging: process.env.REACT_APP_ENABLE_AUDIT_LOGGING !== 'false', // Default ON
    auditRetentionDays: parseInt(process.env.REACT_APP_AUDIT_RETENTION_DAYS || '2555', 10), // 7 years for HIPAA
    baaRequired: process.env.NODE_ENV === 'production' // BAA required in production
  },
  
  // Session management
  session: {
    timeoutMinutes: parseInt(process.env.REACT_APP_SESSION_TIMEOUT_MINUTES || '30', 10),
    warningMinutes: 5,
    requireHttps: process.env.NODE_ENV === 'production', // Force HTTPS in production
    maxConcurrentSessions: 1,
    enableSessionRevocation: true
  },
  
  // API security
  api: {
    requireAuth: true,
    maxRetries: 3,
    timeoutMs: 30000,
    rateLimitPerMinute: process.env.NODE_ENV === 'production' ? 60 : 300,
    enableRequestSigning: process.env.REACT_APP_ENABLE_REQUEST_SIGNING === 'true'
  },
  
  // Content Security Policy (strict for production)
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'"], // NO unsafe-inline in production
    scriptSrcElem: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"], // TODO: Remove unsafe-inline with nonces
    imgSrc: ["'self'", "data:", "https:"],
    connectSrc: [
      "'self'", 
      process.env.REACT_APP_FHIR_SERVER_URL, 
      process.env.REACT_APP_TOKEN_EXCHANGE_URL,
      process.env.REACT_APP_AUDIT_ENDPOINT
    ].filter(Boolean),
    fontSrc: ["'self'", "https://fonts.gstatic.com"],
    objectSrc: ["'none'"],
    mediaSrc: ["'none'"],
    frameSrc: ["'none'"],
    baseUri: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production'
  },
  
  // CORS configuration
  cors: {
    allowedOrigins: process.env.NODE_ENV === 'production' 
      ? (process.env.REACT_APP_ALLOWED_ORIGINS || '').split(',')
      : ['http://localhost:3000', 'http://localhost:3001'],
    allowCredentials: true,
    maxAge: 600 // 10 minutes
  },
  
  // Security headers
  securityHeaders: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '0', // Disabled per modern best practices
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), microphone=(), camera=(), payment=()',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp'
  },
  
  // Encryption settings
  encryption: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    iterations: 100000,
    enableAtRest: process.env.REACT_APP_ENABLE_ENCRYPTION_AT_REST === 'true'
  },
  
  // Monitoring & alerting
  monitoring: {
    enableRealTimeAlerts: process.env.REACT_APP_ENABLE_REAL_TIME_ALERTS === 'true',
    alertEndpoint: process.env.REACT_APP_ALERT_ENDPOINT,
    criticalThresholds: {
      failedAuthAttempts: 5,
      phiAccessPerHour: 100,
      errorRate: 0.05 // 5%
    }
  }
};

// ========================================
// VALIDATION
// ========================================

/**
 * Validate security configuration on load
 * @returns {Object} - { warnings, errors, isValid }
 */
export function validateSecurityConfig() {
  const warnings = [];
  const errors = [];
  const isProduction = process.env.NODE_ENV === 'production';
  
  // CRITICAL: Production checks
  if (isProduction) {
    if (!securityConfig.session.requireHttps) {
      errors.push('❌ HTTPS must be required in production');
    }
    
    if (securityConfig.csp.scriptSrc.includes("'unsafe-inline'")) {
      errors.push("❌ CSP cannot contain 'unsafe-inline' for scripts in production");
    }
    
    if (!process.env.REACT_APP_FHIR_CLIENT_ID || process.env.REACT_APP_FHIR_CLIENT_ID.includes('your_')) {
      errors.push('❌ Production FHIR client ID not configured');
    }
    
    if (!process.env.REACT_APP_AUDIT_ENDPOINT) {
      errors.push('❌ Audit endpoint must be configured in production');
    }
    
    if (!process.env.REACT_APP_BAA_VERIFIED) {
      warnings.push('⚠️  BAA verification status not set');
    }
    
    if (!process.env.REACT_APP_TOKEN_EXCHANGE_API_KEY) {
      errors.push('❌ Token exchange API key not configured');
    }
  }
  
  // Check for missing security features
  if (!securityConfig.phi.enableRedaction) {
    errors.push('❌ PHI redaction cannot be disabled');
  }
  
  if (!securityConfig.phi.auditLogging) {
    errors.push('❌ Audit logging cannot be disabled');
  }
  
  if (securityConfig.session.timeoutMinutes > 60) {
    warnings.push('⚠️  Session timeout exceeds recommended 60 minutes');
  }
  
  // Validate CORS configuration
  if (isProduction && securityConfig.cors.allowedOrigins.length === 0) {
    errors.push('❌ No CORS allowed origins configured for production');
  }
  
  const isValid = errors.length === 0;
  
  return { 
    warnings, 
    errors, 
    isValid,
    summary: `${errors.length} errors, ${warnings.length} warnings`
  };
}

// ========================================
// SECURITY HEADERS
// ========================================

/**
 * Apply security headers to fetch requests
 * @param {Object} headers - Existing headers
 * @returns {Object} - Headers with security additions
 */
export function applySecurityHeaders(headers = {}) {
  return {
    ...headers,
    ...securityConfig.securityHeaders
  };
}

/**
 * Generate Content Security Policy header value
 * @returns {string} - CSP header value
 */
export function generateCSPHeader() {
  const directives = [];
  
  for (const [directive, sources] of Object.entries(securityConfig.csp)) {
    if (directive === 'upgradeInsecureRequests') {
      if (sources) {
        directives.push('upgrade-insecure-requests');
      }
      continue;
    }
    
    const directiveName = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
    directives.push(`${directiveName} ${sources.join(' ')}`);
  }
  
  return directives.join('; ');
}

// ========================================
// CORS VALIDATION
// ========================================

/**
 * Check if a URL is allowed for CORS
 * @param {string} origin - Origin URL
 * @returns {boolean} - Whether origin is allowed
 */
export function isAllowedOrigin(origin) {
  if (!origin) return false;
  
  const allowedOrigins = securityConfig.cors.allowedOrigins;
  
  if (process.env.NODE_ENV === 'development') {
    // More permissive in development
    return allowedOrigins.some(allowed => 
      origin.startsWith(allowed)
    );
  }
  
  // Strict matching in production
  return allowedOrigins.includes(origin);
}

// ========================================
// SESSION MANAGEMENT
// ========================================

let sessionTimer = null;
let warningTimer = null;
let activityListeners = [];

/**
 * Start session timeout timer
 * @param {Function} onTimeout - Callback when session expires
 * @param {Function} onWarning - Callback for timeout warning
 */
export function startSessionTimer(onTimeout, onWarning) {
  clearSessionTimers();
  
  const timeoutMs = securityConfig.session.timeoutMinutes * 60 * 1000;
  const warningMs = (securityConfig.session.timeoutMinutes - securityConfig.session.warningMinutes) * 60 * 1000;
  
  if (onWarning && warningMs > 0) {
    warningTimer = setTimeout(onWarning, warningMs);
  }
  
  sessionTimer = setTimeout(onTimeout, timeoutMs);
  
  // Track last activity
  sessionStorage.setItem('lastActivity', new Date().toISOString());
}

/**
 * Clear session timers
 */
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

/**
 * Reset session timer on user activity
 * @param {Function} onTimeout - Callback when session expires
 * @param {Function} onWarning - Callback for timeout warning
 */
export function resetSessionTimer(onTimeout, onWarning) {
  startSessionTimer(onTimeout, onWarning);
}

/**
 * Setup activity listeners to reset session timer
 * @param {Function} onTimeout - Callback when session expires
 * @param {Function} onWarning - Callback for timeout warning
 */
export function setupActivityListeners(onTimeout, onWarning) {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
  
  const resetHandler = () => {
    resetSessionTimer(onTimeout, onWarning);
  };
  
  events.forEach(event => {
    document.addEventListener(event, resetHandler);
    activityListeners.push({ event, handler: resetHandler });
  });
}

/**
 * Remove activity listeners
 */
export function removeActivityListeners() {
  activityListeners.forEach(({ event, handler }) => {
    document.removeEventListener(event, handler);
  });
  activityListeners = [];
}

// ========================================
// INITIALIZATION
// ========================================

/**
 * Initialize security configuration
 * Runs validation and logs results
 */
export function initSecurity() {
  const validation = validateSecurityConfig();
  
  console.log('🔒 Security Configuration Initialized');
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Valid: ${validation.isValid ? '✓' : '✗'}`);
  console.log(`   Summary: ${validation.summary}`);
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Security Warnings:');
    validation.warnings.forEach(w => console.warn(`   ${w}`));
  }
  
  if (validation.errors.length > 0) {
    console.error('❌ Security Errors:');
    validation.errors.forEach(e => console.error(`   ${e}`));
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Security configuration validation failed in production');
    }
  }
  
  return validation;
}

// Auto-initialize on import
if (typeof window !== 'undefined') {
  initSecurity();
}