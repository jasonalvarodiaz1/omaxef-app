// Feature flags for gradual rollout
export const FEATURES = {
  USE_RXNORM_API: process.env.REACT_APP_USE_RXNORM === 'true',
  RXNORM_API_TIMEOUT: 5000, // 5 second timeout
  FALLBACK_TO_LOCAL: true,   // Use local DB if RxNorm fails
  CACHE_DURATION: 3600000,   // 1 hour cache
};

export const isRxNormEnabled = () => {
  // Can add additional checks here
  return FEATURES.USE_RXNORM_API && !isOffline();
};

const isOffline = () => {
  return !navigator.onLine;
};