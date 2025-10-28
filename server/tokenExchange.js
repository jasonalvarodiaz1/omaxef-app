// Production-hardened OAuth token-exchange server
// Includes: authentication, rate limiting, secrets management, audit logging

const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');

const app = express();

// Middleware to parse bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ========================================
// SECURITY: Environment validation
// ========================================
const NODE_ENV = process.env.NODE_ENV || 'development';
const IS_PRODUCTION = NODE_ENV === 'production';

if (IS_PRODUCTION) {
  console.log('⚠️  Running in PRODUCTION mode - enforcing security controls');
  
  // Validate required production configs
  if (!process.env.TOKEN_EXCHANGE_API_KEY) {
    throw new Error('TOKEN_EXCHANGE_API_KEY must be set in production');
  }
  if (!process.env.ALLOWED_IPS && !process.env.ALLOWED_NETWORKS) {
    console.warn('⚠️  No IP allowlist configured - consider setting ALLOWED_IPS');
  }
}

// ========================================
// SECURITY: Rate limiting
// ========================================
const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 10 : 100, // 10 requests per 15min in prod
  message: {
    error: 'too_many_requests',
    error_description: 'Rate limit exceeded. Try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    auditLog('RATE_LIMIT_EXCEEDED', {
      ip: req.ip,
      headers: sanitizeHeaders(req.headers)
    });
    res.status(429).json({
      error: 'too_many_requests',
      error_description: 'Too many requests. Please try again later.'
    });
  }
});

app.use('/exchange', rateLimiter);

// ========================================
// SECURITY: IP allowlisting
// ========================================
function ipAllowlistMiddleware(req, res, next) {
  if (!IS_PRODUCTION) {
    return next(); // Skip in dev
  }
  
  const allowedIps = process.env.ALLOWED_IPS?.split(',') || [];
  const clientIp = req.ip || req.connection.remoteAddress;
  
  if (allowedIps.length > 0 && !allowedIps.includes(clientIp)) {
    auditLog('IP_BLOCKED', { 
      clientIp, 
      allowedIps: allowedIps.length 
    });
    return res.status(403).json({
      error: 'forbidden',
      error_description: 'Access denied'
    });
  }
  
  next();
}

app.use(ipAllowlistMiddleware);

// ========================================
// SECURITY: Authentication middleware
// ========================================
function authMiddleware(req, res, next) {
  if (!IS_PRODUCTION) {
    return next(); // Skip in dev for easier testing
  }
  
  const apiKey = req.headers['x-api-key'] || req.headers['authorization']?.replace('Bearer ', '');
  const expectedKey = process.env.TOKEN_EXCHANGE_API_KEY;
  
  if (!apiKey) {
    auditLog('AUTH_MISSING', { ip: req.ip });
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Missing authentication credentials'
    });
  }
  
  // Use constant-time comparison to prevent timing attacks
  const expectedBuffer = Buffer.from(expectedKey);
  const providedBuffer = Buffer.from(apiKey);
  
  if (expectedBuffer.length !== providedBuffer.length || 
      !crypto.timingSafeEqual(expectedBuffer, providedBuffer)) {
    auditLog('AUTH_FAILED', { ip: req.ip });
    return res.status(401).json({
      error: 'unauthorized',
      error_description: 'Invalid authentication credentials'
    });
  }
  
  next();
}

app.use('/exchange', authMiddleware);

// ========================================
// SECURITY: Audit logging
// ========================================
const auditLogs = [];

function auditLog(action, details = {}) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    details: sanitizeForAudit(details),
    id: crypto.randomUUID()
  };
  
  auditLogs.push(entry);
  
  // Keep only last 1000 entries in memory
  if (auditLogs.length > 1000) {
    auditLogs.shift();
  }
  
  // In production, send to persistent storage
  if (IS_PRODUCTION) {
    // TODO: Send to Azure Monitor, CloudWatch, or your SIEM
    console.log('[AUDIT]', JSON.stringify(entry));
  }
  
  return entry;
}

function sanitizeForAudit(data) {
  const sanitized = { ...data };
  
  // Remove sensitive fields
  const sensitiveKeys = ['code', 'access_token', 'refresh_token', 'client_secret', 'code_verifier'];
  for (const key of sensitiveKeys) {
    if (sanitized[key]) {
      sanitized[key] = '[REDACTED]';
    }
  }
  
  return sanitized;
}

function sanitizeHeaders(headers) {
  const sanitized = { ...headers };
  delete sanitized.authorization;
  delete sanitized['x-api-key'];
  return sanitized;
}

// ========================================
// SECURITY: Secrets management
// ========================================
async function getSecret(secretName) {
  // In production, fetch from Azure Key Vault or AWS Secrets Manager
  if (IS_PRODUCTION) {
    // TODO: Implement Key Vault integration
    // Example using Azure Key Vault:
    // const { SecretClient } = require("@azure/keyvault-secrets");
    // const credential = new DefaultAzureCredential();
    // const client = new SecretClient(process.env.KEY_VAULT_URL, credential);
    // const secret = await client.getSecret(secretName);
    // return secret.value;
    
    console.warn(`⚠️  Using environment variable for ${secretName} - migrate to Key Vault!`);
  }
  
  // Fallback to environment variables (dev only)
  return process.env[secretName];
}

// ========================================
// MAIN ENDPOINT: Token exchange
// ========================================
app.post('/exchange', async (req, res) => {
  const startTime = Date.now();
  const { code, redirect_uri, code_verifier } = req.body;
  
  // Validation
  if (!code) {
    auditLog('EXCHANGE_FAILED', { reason: 'missing_code', ip: req.ip });
    return res.status(400).json({ 
      error: 'invalid_request', 
      error_description: 'Missing code parameter' 
    });
  }
  
  if (!redirect_uri) {
    auditLog('EXCHANGE_FAILED', { reason: 'missing_redirect_uri', ip: req.ip });
    return res.status(400).json({ 
      error: 'invalid_request', 
      error_description: 'Missing redirect_uri parameter' 
    });
  }
  
  try {
    // Fetch secrets securely
    const tokenEndpoint = await getSecret('EPIC_TOKEN_ENDPOINT');
    const clientId = await getSecret('EPIC_CLIENT_ID');
    const clientSecret = await getSecret('EPIC_CLIENT_SECRET'); // Optional
    
    if (!tokenEndpoint) {
      throw new Error('EPIC_TOKEN_ENDPOINT not configured');
    }
    
    if (!clientId) {
      throw new Error('EPIC_CLIENT_ID not configured');
    }
    
    // Build token request
    const tokenRequest = {
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: clientId,
      code_verifier
    };
    
    // Add client_secret if provided
    if (clientSecret) {
      tokenRequest.client_secret = clientSecret;
    }
    
    // Exchange code for token
    const response = await axios.post(
      tokenEndpoint, 
      new URLSearchParams(tokenRequest).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'OmaxefPA/1.0'
        },
        timeout: 10000 // 10 second timeout
      }
    );
    
    const duration = Date.now() - startTime;
    
    auditLog('EXCHANGE_SUCCESS', {
      ip: req.ip,
      durationMs: duration,
      tokenType: response.data.token_type
    });
    
    // Return token response
    res.json(response.data);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    
    // Log error details (sanitized)
    auditLog('EXCHANGE_ERROR', {
      ip: req.ip,
      durationMs: duration,
      errorMessage: error.message,
      errorCode: error.code,
      httpStatus: error.response?.status
    });
    
    console.error('Token exchange error:', error.response?.data || error.message);
    
    // Forward error from token endpoint
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else if (error.code === 'ECONNABORTED') {
      res.status(504).json({ 
        error: 'timeout', 
        error_description: 'Token exchange request timed out' 
      });
    } else {
      res.status(500).json({ 
        error: 'server_error', 
        error_description: IS_PRODUCTION ? 'Internal server error' : error.message
      });
    }
  }
});

// ========================================
// Health check endpoint (no auth required)
// ========================================
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    service: 'token-exchange',
    environment: NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// ========================================
// Audit log endpoint (requires auth)
// ========================================
app.get('/audit', authMiddleware, (req, res) => {
  if (!IS_PRODUCTION) {
    // Allow access in dev for debugging
    const limit = parseInt(req.query.limit) || 100;
    return res.json({
      logs: auditLogs.slice(-limit),
      count: auditLogs.length
    });
  }
  
  // In production, only allow admins
  res.status(403).json({
    error: 'forbidden',
    error_description: 'Access denied'
  });
});

// ========================================
// HTTPS enforcement
// ========================================
app.use((req, res, next) => {
  if (IS_PRODUCTION && req.headers['x-forwarded-proto'] !== 'https') {
    auditLog('HTTP_REDIRECT', { ip: req.ip, url: req.url });
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// ========================================
// Error handling
// ========================================
app.use((err, req, res, next) => {
  auditLog('UNHANDLED_ERROR', {
    ip: req.ip,
    error: err.message,
    stack: IS_PRODUCTION ? undefined : err.stack
  });
  
  res.status(500).json({
    error: 'server_error',
    error_description: IS_PRODUCTION ? 'Internal server error' : err.message
  });
});

// ========================================
// Module export
// ========================================
module.exports = app;

// ========================================
// Standalone server
// ========================================
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  
  const server = app.listen(PORT, () => {
    console.log(`🚀 Token exchange server listening on port ${PORT}`);
    console.log(`📊 Environment: ${NODE_ENV}`);
    console.log(`🔒 Security controls:`);
    console.log(`  - Authentication: ${IS_PRODUCTION ? 'ENABLED' : 'DISABLED (dev mode)'}`);
    console.log(`  - Rate limiting: ${IS_PRODUCTION ? '10 req/15min' : '100 req/15min'}`);
    console.log(`  - IP allowlist: ${process.env.ALLOWED_IPS ? 'ENABLED' : 'DISABLED'}`);
    console.log(`  - Audit logging: ENABLED`);
    console.log('');
    console.log('Configuration check:');
    console.log(`  EPIC_TOKEN_ENDPOINT: ${process.env.EPIC_TOKEN_ENDPOINT ? '✓ SET' : '✗ NOT SET'}`);
    console.log(`  EPIC_CLIENT_ID: ${process.env.EPIC_CLIENT_ID ? '✓ SET' : '✗ NOT SET'}`);
    console.log(`  EPIC_CLIENT_SECRET: ${process.env.EPIC_CLIENT_SECRET ? '✓ SET' : '✗ NOT SET'}`);
    console.log(`  TOKEN_EXCHANGE_API_KEY: ${process.env.TOKEN_EXCHANGE_API_KEY ? '✓ SET' : '✗ NOT SET'}`);
    
    if (IS_PRODUCTION && !process.env.TOKEN_EXCHANGE_API_KEY) {
      console.error('\n❌ PRODUCTION ERROR: TOKEN_EXCHANGE_API_KEY not configured!');
      process.exit(1);
    }
  });
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Server closed');
      process.exit(0);
    });
  });
}