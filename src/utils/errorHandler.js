export class PAEvaluationError extends Error {
  constructor(message, code, details = {}) {
    super(message);
    this.name = 'PAEvaluationError';
    this.code = code;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}

export class FHIRDataError extends PAEvaluationError {
  constructor(message, details) {
    super(message, 'FHIR_DATA_ERROR', details);
    this.name = 'FHIRDataError';
  }
}

export class CriteriaEvaluationError extends PAEvaluationError {
  constructor(criterion, message, details) {
    super(message, 'CRITERIA_EVAL_ERROR', { criterion, ...details });
    this.name = 'CriteriaEvaluationError';
  }
}

export const errorRecoveryStrategies = {
  FHIR_DATA_ERROR: {
    retry: true,
    maxRetries: 3,
    fallback: 'USE_CACHED_DATA',
    userMessage: 'Unable to retrieve some clinical data. Using available information.'
  },
  CRITERIA_EVAL_ERROR: {
    retry: false,
    fallback: 'RETHROW',
    userMessage: 'Some criteria require manual review.'
  },
  NETWORK_ERROR: {
    retry: true,
    maxRetries: 5,
    backoffMs: [1000, 2000, 4000, 8000, 16000],
    fallback: 'OFFLINE_MODE',
    userMessage: 'Connection issue detected. Working in offline mode.'
  }
};

export async function withErrorRecovery(fn, errorType, context = {}) {
  const strategy = errorRecoveryStrategies[errorType];
  let lastError;
  
  for (let attempt = 0; attempt <= (strategy.maxRetries || 0); attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Log the error with context
      console.error(`Error in ${context.operation || 'operation'}:`, {
        attempt,
        error: error.message,
        context
      });
      
      if (strategy.retry && attempt < strategy.maxRetries) {
        const backoff = strategy.backoffMs?.[attempt] || 1000;
        await new Promise(resolve => setTimeout(resolve, backoff));
        continue;
      }
      
      // Apply fallback strategy
      if (strategy.fallback === 'USE_CACHED_DATA' && context.cacheKey) {
        return getCachedData(context.cacheKey);
      }
      
      if (strategy.fallback === 'MARK_AS_PENDING_REVIEW') {
        return {
          status: 'PENDING_REVIEW',
          reason: strategy.userMessage,
          requiresManualReview: true,
          error: lastError.message
        };
      }
      
      break;
    }
  }
  
  throw new PAEvaluationError(
    strategy.userMessage || lastError.message,
    errorType,
    { originalError: lastError.message, context }
  );
}

function getCachedData(cacheKey) {
  // Simple cache implementation - in production, use proper cache service
  const cache = window.sessionStorage.getItem(cacheKey);
  return cache ? JSON.parse(cache) : null;
}
