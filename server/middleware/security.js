// Security middleware for Express server
const helmet = require('helmet');
const cors = require('cors');

/**
 * Configure security middleware
 * @param {Express} app - Express app instance
 * @param {Object} options - Configuration options
 */
function configureSecurityMiddleware(app, options = {}) {
  const IS_PRODUCTION = process.env.NODE_ENV === 'production';
  
  // ========================================
  // HELMET - Security headers
  // ========================================
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"], // TODO: Use nonces
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'none'"],
        frameSrc: ["'none'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    frameguard: {
      action: 'deny'
    },
    noSniff: true,
    xssFilter: false, // Modern browsers don't need this
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin'
    }
  }));
  
  // ========================================
  // CORS configuration
  // ========================================
  const allowedOrigins = IS_PRODUCTION
    ? (process.env.ALLOWED_ORIGINS || '').split(',')
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin) {
        return callback(null, true);
      }
      
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`CORS blocked origin: ${origin}`);
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    maxAge: 600 // 10 minutes
  }));
  
  // ========================================
  // Additional security headers
  // ========================================
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
    
    if (IS_PRODUCTION) {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    }
    
    next();
  });
  
  // ========================================
  // Request logging (sanitized)
  // ========================================
  app.use((req, res, next) => {
    const startTime = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const logEntry = {
        timestamp: new Date().toISOString(),
        method: req.method,
        path: sanitizePath(req.path),
        status: res.statusCode,
        duration,
        ip: req.ip,
        userAgent: req.headers['user-agent']
      };
      
      if (res.statusCode >= 400) {
        console.warn('[REQUEST]', JSON.stringify(logEntry));
      } else {
        console.log('[REQUEST]', JSON.stringify(logEntry));
      }
    });
    
    next();
  });
  
  // ========================================
  // Request size limits
  // ========================================
  app.use(require('express').json({ limit: '1mb' }));
  app.use(require('express').urlencoded({ extended: true, limit: '1mb' }));
}

/**
 * Sanitize path to remove potential PHI
 */
function sanitizePath(path) {
  return path
    .replace(/\/Patient\/[^/]+/g, '/Patient/[ID]')
    .replace(/\b\d{6,}\b/g, '[ID]');
}

module.exports = { configureSecurityMiddleware };
