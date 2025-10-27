import { trackCachePerformance } from './monitoring';

export class CacheManager {
  constructor() {
    // In-memory cache for hot data
    this.memoryCache = new Map();
    
    // IndexedDB for larger datasets
    this.initIndexedDB();
    
    // Cache TTLs by data type
    this.ttlConfig = {
      patientData: 5 * 60 * 1000,        // 5 minutes
      drugCriteria: 24 * 60 * 60 * 1000, // 24 hours
      evaluationResults: 15 * 60 * 1000,  // 15 minutes
      evaluations: 15 * 60 * 1000,        // 15 minutes
      fhirObservations: 10 * 60 * 1000    // 10 minutes
    };
    
    // Stats for monitoring
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
  
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PAEvaluationCache', 1);
      
      request.onerror = () => {
        console.error('IndexedDB initialization failed:', request.error);
        reject(request.error);
      };
      
      request.onsuccess = () => {
        this.db = request.result;
        console.log('IndexedDB initialized successfully');
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        
        // Create object stores for different data types
        ['patientData', 'drugCriteria', 'evaluations', 'fhirCache'].forEach(storeName => {
          if (!db.objectStoreNames.contains(storeName)) {
            const store = db.createObjectStore(storeName, { keyPath: 'id' });
            store.createIndex('timestamp', 'timestamp', { unique: false });
            store.createIndex('patientId', 'patientId', { unique: false });
          }
        });
      };
    });
  }
  
  generateCacheKey(type, params) {
    const normalized = Object.keys(params)
      .sort()
      .map(k => `${k}:${params[k]}`)
      .join('|');
    return `${type}:${normalized}`;
  }
  
  async get(type, params) {
    const startTime = performance.now();
    const key = this.generateCacheKey(type, params);
    
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      const ttl = this.ttlConfig[type] || 5 * 60 * 1000;
      
      if (Date.now() - cached.timestamp < ttl) {
        this.stats.hits++;
        const duration = performance.now() - startTime;
        trackCachePerformance('get', true, duration);
        return cached.data;
      }
      this.memoryCache.delete(key);
    }
    
    // Check IndexedDB for larger data
    if (this.db) {
      try {
        const tx = this.db.transaction([type], 'readonly');
        const store = tx.objectStore(type);
        const request = store.get(key);
        
        const result = await new Promise((resolve) => {
          request.onsuccess = () => {
            const result = request.result;
            const ttl = this.ttlConfig[type] || 5 * 60 * 1000;
            
            if (result && Date.now() - result.timestamp < ttl) {
              // Promote to memory cache
              this.memoryCache.set(key, result);
              this.stats.hits++;
              const duration = performance.now() - startTime;
              trackCachePerformance('get', true, duration);
              resolve(result.data);
            } else {
              this.stats.misses++;
              const duration = performance.now() - startTime;
              trackCachePerformance('get', false, duration);
              resolve(null);
            }
          };
          request.onerror = () => {
            this.stats.misses++;
            const duration = performance.now() - startTime;
            trackCachePerformance('get', false, duration);
            resolve(null);
          };
        });
        
        return result;
      } catch (error) {
        console.error('IndexedDB read error:', error);
        this.stats.misses++;
        const duration = performance.now() - startTime;
        trackCachePerformance('get', false, duration);
        return null;
      }
    }
    
    this.stats.misses++;
    const duration = performance.now() - startTime;
    trackCachePerformance('get', false, duration);
    return null;
  }
  
  async set(type, params, data) {
    const startTime = performance.now();
    const key = this.generateCacheKey(type, params);
    const cacheEntry = {
      id: key,
      data,
      timestamp: Date.now(),
      patientId: params.patientId
    };
    
    // Store in memory for hot access
    this.memoryCache.set(key, cacheEntry);
    this.stats.sets++;
    
    // Limit memory cache size
    if (this.memoryCache.size > 100) {
      const oldestKey = this.memoryCache.keys().next().value;
      this.memoryCache.delete(oldestKey);
    }
    
    // Persist to IndexedDB
    if (this.db) {
      try {
        const tx = this.db.transaction([type], 'readwrite');
        const store = tx.objectStore(type);
        store.put(cacheEntry);
      } catch (error) {
        console.error('IndexedDB write error:', error);
      }
    }
    
    const duration = performance.now() - startTime;
    trackCachePerformance('set', true, duration);
    
    return data;
  }
  
  async invalidatePatientData(patientId) {
    const startTime = performance.now();
    let deletedCount = 0;
    
    // Clear from memory cache
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.patientId === patientId) {
        this.memoryCache.delete(key);
        deletedCount++;
      }
    }
    
    // Clear from IndexedDB
    if (this.db) {
      const stores = ['patientData', 'evaluations', 'fhirCache'];
      for (const storeName of stores) {
        try {
          const tx = this.db.transaction([storeName], 'readwrite');
          const store = tx.objectStore(storeName);
          const index = store.index('patientId');
          const request = index.openCursor(IDBKeyRange.only(patientId));
          
          request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
              cursor.delete();
              deletedCount++;
              cursor.continue();
            }
          };
        } catch (error) {
          console.error('IndexedDB delete error:', error);
        }
      }
    }
    
    this.stats.deletes += deletedCount;
    const duration = performance.now() - startTime;
    trackCachePerformance('invalidate', true, duration);
    
    return deletedCount;
  }
  
  clearAll() {
    this.memoryCache.clear();
    
    if (this.db) {
      const stores = ['patientData', 'drugCriteria', 'evaluations', 'fhirCache'];
      stores.forEach(storeName => {
        try {
          const tx = this.db.transaction([storeName], 'readwrite');
          const store = tx.objectStore(storeName);
          store.clear();
        } catch (error) {
          console.error('IndexedDB clear error:', error);
        }
      });
    }
    
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0
    };
  }
  
  getStats() {
    const total = this.stats.hits + this.stats.misses;
    return {
      ...this.stats,
      hitRate: total > 0 ? (this.stats.hits / total) * 100 : 0,
      memoryCacheSize: this.memoryCache.size
    };
  }
}