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
      fhirObservations: 10 * 60 * 1000    // 10 minutes
    };
  }
  
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('PAEvaluationCache', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
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
    const key = this.generateCacheKey(type, params);
    
    // Check memory cache first
    if (this.memoryCache.has(key)) {
      const cached = this.memoryCache.get(key);
      if (Date.now() - cached.timestamp < this.ttlConfig[type]) {
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
        
        return new Promise((resolve) => {
          request.onsuccess = () => {
            const result = request.result;
            if (result && Date.now() - result.timestamp < this.ttlConfig[type]) {
              // Promote to memory cache
              this.memoryCache.set(key, result);
              resolve(result.data);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        });
      } catch (error) {
        console.error('IndexedDB read error:', error);
        return null;
      }
    }
    
    return null;
  }
  
  async set(type, params, data) {
    const key = this.generateCacheKey(type, params);
    const cacheEntry = {
      id: key,
      data,
      timestamp: Date.now(),
      patientId: params.patientId
    };
    
    // Store in memory for hot access
    this.memoryCache.set(key, cacheEntry);
    
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
    
    return data;
  }
  
  async invalidatePatientData(patientId) {
    // Clear from memory cache
    for (const [key, value] of this.memoryCache.entries()) {
      if (value.patientId === patientId) {
        this.memoryCache.delete(key);
      }
    }
    
    // Clear from IndexedDB
    if (this.db) {
      const stores = ['patientData', 'evaluations', 'fhirCache'];
      for (const storeName of stores) {
        const tx = this.db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);
        const index = store.index('patientId');
        const request = index.openCursor(IDBKeyRange.only(patientId));
        
        request.onsuccess = (event) => {
          const cursor = event.target.result;
          if (cursor) {
            cursor.delete();
            cursor.continue();
          }
        };
      }
    }
  }
}
