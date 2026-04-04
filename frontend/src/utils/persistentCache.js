class PersistentCache {
  constructor(cacheName = 'dream-project-cache-v1') {
    this.cacheName = cacheName;
    this.memoryCache = {};
  }

  async get(key, maxAge = 5 * 60 * 1000) {
    const memCached = this.memoryCache[key];
    if (memCached && Date.now() - memCached.timestamp < maxAge) {
      console.log(`✅ MEMORY CACHE HIT: ${key}`);
      return memCached.data;
    }

    try {
      const cache = await caches.open(this.cacheName);
      const response = await cache.match(key);

      if (response) {
        const data = await response.json();
        const timestamp = parseInt(response.headers.get('X-Timestamp') || '0');

        if (Date.now() - timestamp < maxAge) {
          console.log(`✅ DISK CACHE HIT: ${key}`);

          this.memoryCache[key] = { data, timestamp };

          return data;
        } else {
          console.log(`⏰ CACHE EXPIRED: ${key}`);
          await cache.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache get error:', error);
    }

    console.log(`❌ CACHE MISS: ${key}`);
    return null;
  }

  async set(key, data) {
    const timestamp = Date.now();

    this.memoryCache[key] = { data, timestamp };

    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(JSON.stringify(data), {
        headers: {
          'Content-Type': 'application/json',
          'X-Timestamp': timestamp.toString()
        }
      });

      await cache.put(key, response);
      console.log(`💾 CACHED TO DISK: ${key}`);
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async clear() {
    this.memoryCache = {};
    try {
      await caches.delete(this.cacheName);
      console.log('🗑️ CACHE CLEARED');
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  async delete(key) {
    delete this.memoryCache[key];
    try {
      const cache = await caches.open(this.cacheName);
      await cache.delete(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async getStats() {
    const memoryKeys = Object.keys(this.memoryCache).length;
    let diskKeys = 0;

    try {
      const cache = await caches.open(this.cacheName);
      const keys = await cache.keys();
      diskKeys = keys.length;
    } catch (error) {
      console.error('Stats error:', error);
    }

    return {
      memoryKeys,
      diskKeys,
      totalKeys: diskKeys
    };
  }
}

export const persistentCache = new PersistentCache();

if (typeof window !== 'undefined') {
  window.persistentCache = persistentCache;
}