import axios from 'axios';

interface CachedCookies {
  cookies: Array<{ name: string; value: string }>;
  timestamp: number;
}

/**
 * Optimized Byparr client with caching and connection pooling
 */
export class ByparrClient {
  private byparrUrl: string;
  private axiosInstance;
  private cookieCache: Map<string, CachedCookies> = new Map();
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private pendingRequests: Map<string, Promise<any>> = new Map();

  constructor(byparrUrl: string = 'http://localhost:8191') {
    this.byparrUrl = byparrUrl;
    this.axiosInstance = axios.create({
      timeout: 120000, // 120 seconds
      maxRedirects: 5,
    });
  }

  /**
   * Get cached cookies for a domain
   */
  private getCachedCookies(domain: string): Array<{ name: string; value: string }> | null {
    const cached = this.cookieCache.get(domain);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.cookieCache.delete(domain);
      return null;
    }

    console.log(`[Byparr Cache] Using cached cookies for ${domain} (age: ${Math.round(age / 1000)}s)`);
    return cached.cookies;
  }

  /**
   * Cache cookies for a domain
   */
  private cacheCookies(domain: string, cookies: Array<{ name: string; value: string }>) {
    this.cookieCache.set(domain, {
      cookies,
      timestamp: Date.now(),
    });
    console.log(`[Byparr Cache] Cached ${cookies.length} cookies for ${domain}`);
  }

  /**
   * Extract domain from URL
   */
  private getDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return url;
    }
  }

  /**
   * Make a GET request through Byparr with request deduplication
   */
  async get(url: string, options?: {
    headers?: Record<string, string>;
    maxTimeout?: number;
  }): Promise<{
    status: number;
    data: string;
    headers: Record<string, string>;
    cookies: Array<{ name: string; value: string }>;
  }> {
    const domain = this.getDomain(url);

    // Check if there's already a pending request for this URL
    const pendingRequest = this.pendingRequests.get(url);
    if (pendingRequest) {
      console.log(`[Byparr] Reusing pending request for ${url}`);
      return pendingRequest;
    }

    // Check cache first
    const cachedCookies = this.getCachedCookies(domain);

    const requestPromise = this._performRequest(url, options, cachedCookies);
    this.pendingRequests.set(url, requestPromise);

    try {
      const result = await requestPromise;
      return result;
    } finally {
      this.pendingRequests.delete(url);
    }
  }

  private async _performRequest(
    url: string,
    options?: { headers?: Record<string, string>; maxTimeout?: number },
    cachedCookies?: Array<{ name: string; value: string }> | null
  ) {
    const startTime = Date.now();
    console.log(`[Byparr] Requesting: ${url}`);

    try {
      const requestBody: any = {
        cmd: 'request.get',
        url: url,
        maxTimeout: options?.maxTimeout || 90000,
      };

      // Include cached cookies if available
      if (cachedCookies && cachedCookies.length > 0) {
        requestBody.cookies = cachedCookies;
        console.log(`[Byparr] Using ${cachedCookies.length} cached cookies`);
      }

      const response = await this.axiosInstance.post(`${this.byparrUrl}/v1`, requestBody);

      const duration = Date.now() - startTime;
      console.log(`[Byparr] Completed in ${(duration / 1000).toFixed(1)}s`);

      if (response.data.status === 'ok') {
        const result = {
          status: response.data.solution.status,
          data: response.data.solution.response,
          headers: response.data.solution.headers,
          cookies: response.data.solution.cookies,
        };

        // Cache the cookies
        if (result.cookies && result.cookies.length > 0) {
          const domain = this.getDomain(url);
          this.cacheCookies(domain, result.cookies);
        }

        return result;
      } else {
        throw new Error(`Byparr error: ${response.data.message}`);
      }
    } catch (error) {
      console.error(`[Byparr] Request failed:`, error);
      throw error;
    }
  }

  /**
   * Warm up the cache by making a request to a domain
   */
  async warmup(baseUrl: string): Promise<boolean> {
    try {
      console.log(`[Byparr Warmup] Pre-warming cache for ${baseUrl}`);
      await this.get(baseUrl);
      return true;
    } catch (error) {
      console.error(`[Byparr Warmup] Failed:`, error);
      return false;
    }
  }

  /**
   * Check if Byparr is running and healthy
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.axiosInstance.get(`${this.byparrUrl}/health`, {
        timeout: 15000,
      });
      return response.data.msg === 'Byparr is working!';
    } catch (error) {
      console.error('Byparr health check failed:', error);
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      cachedDomains: this.cookieCache.size,
      pendingRequests: this.pendingRequests.size,
      cacheEntries: Array.from(this.cookieCache.entries()).map(([domain, data]) => ({
        domain,
        age: Math.round((Date.now() - data.timestamp) / 1000),
        cookieCount: data.cookies.length,
      })),
    };
  }
}

// Singleton instance
export const byparrClient = new ByparrClient();
