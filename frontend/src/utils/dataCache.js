class DataCache {
  constructor() {
    this.cache = {};
    this.timestamps = {};
  }

  get(key, maxAge = 5 * 60 * 1000) {
    const cached = this.cache[key];
    const timestamp = this.timestamps[key];

    if (!cached || !timestamp) return null;

    if (Date.now() - timestamp > maxAge) {
      delete this.cache[key];
      delete this.timestamps[key];
      return null;
    }

    console.log(`✅ Cache hit: ${key}`);
    return cached;
  }

  set(key, data) {
    this.cache[key] = data;
    this.timestamps[key] = Date.now();
    console.log(`💾 Cached: ${key}`);
  }

  clear() {
    this.cache = {};
    this.timestamps = {};
    console.log('🗑️ Cache cleared');
  }

  delete(key) {
    delete this.cache[key];
    delete this.timestamps[key];
  }
}

export const appCache = new DataCache();