import AnimePahe from "@consumet/extensions/dist/providers/anime/animepahe";
import axios, { AxiosInstance } from "axios";
import { byparrClient } from "./byparr-client";

/**
 * Custom AnimePahe provider with Byparr integration
 * Uses Byparr to bypass Cloudflare protection on animepahe.pw
 */
class AnimePaheFixed extends AnimePahe {
  private cachedCookies: Array<{ name: string; value: string }> = [];

  constructor() {
    super();
    this.baseUrl = 'https://animepahe.pw';

    // Override the parent's axios client to intercept all HTTP requests
    // This is a workaround since we can't override the private client property
    const originalClient = (this as any).client;
    (this as any).client = this.createProxyClient(originalClient);

    // IMPORTANT: Override the parent's arrow function fetchEpisodeSources
    // Must do this in constructor since parent uses arrow function property
    this.fetchEpisodeSources = this.customFetchEpisodeSources.bind(this);
  }

  /**
   * Create a proxy axios client that routes through Byparr
   */
  private createProxyClient(originalClient: AxiosInstance): AxiosInstance {
    const self = this;
    return {
      ...originalClient,
      get: async (url: string, config?: any) => {
        // Use Byparr for all requests
        try {
          const fullUrl = url.startsWith('http') ? url : `${this.baseUrl}${url}`;
          console.log(`[AnimePahe] Intercepting GET: ${fullUrl}`);
          const htmlResponse = await self.fetchThroughByparr(fullUrl);

          // Extract JSON from HTML response (Byparr wraps it in <pre> tags)
          let responseData = htmlResponse;
          const preMatch = htmlResponse.match(/<pre>(.*?)<\/pre>/s);
          if (preMatch) {
            responseData = preMatch[1];
          }

          // Try to parse as JSON (for API endpoints), otherwise return as HTML
          let parsedData;
          try {
            parsedData = JSON.parse(responseData);
          } catch (e) {
            // Not JSON, return as HTML string (for page scraping)
            parsedData = responseData;
          }

          return {
            data: parsedData,
            status: 200,
            statusText: 'OK',
            headers: {},
            config: config || {},
          };
        } catch (error) {
          console.error(`[AnimePahe] Proxy client error:`, error);
          throw error;
        }
      },
      post: originalClient.post.bind(originalClient),
      put: originalClient.put.bind(originalClient),
      delete: originalClient.delete.bind(originalClient),
      patch: originalClient.patch.bind(originalClient),
      head: originalClient.head.bind(originalClient),
      options: originalClient.options.bind(originalClient),
      request: originalClient.request.bind(originalClient),
    } as any;
  }

  /**
   * Fetch data through Byparr to bypass Cloudflare
   */
  private async fetchThroughByparr(url: string): Promise<string> {
    console.log(`[Byparr] Fetching: ${url}`);

    const response = await byparrClient.get(url, {
      maxTimeout: 90000, // 90 seconds for Cloudflare challenges
    });

    // Cache cookies for this session
    if (response.cookies && response.cookies.length > 0) {
      this.cachedCookies = response.cookies;
      console.log(`[Byparr] Cached ${response.cookies.length} cookies`);
    }

    return response.data;
  }

  /**
   * Override search to use Byparr
   */
  async search(query: string, page: number = 1): Promise<any> {
    try {
      const searchUrl = `${this.baseUrl}/api?m=search&q=${encodeURIComponent(query)}&page=${page}`;
      const html = await this.fetchThroughByparr(searchUrl);

      // Extract JSON from HTML response (Byparr wraps it in <pre> tags)
      let jsonData = html;

      // If wrapped in HTML, extract the JSON
      const preMatch = html.match(/<pre>(.*?)<\/pre>/s);
      if (preMatch) {
        jsonData = preMatch[1];
      }

      // Parse JSON response
      const data = JSON.parse(jsonData);

      return {
        currentPage: data.current_page,
        hasNextPage: data.current_page < data.last_page,
        results: data.data.map((anime: any) => ({
          id: anime.session,
          title: anime.title,
          url: `${this.baseUrl}/anime/${anime.session}`,
          image: anime.poster,
          type: anime.type,
          releaseDate: anime.year?.toString(),
          status: anime.status,
        })),
      };
    } catch (error) {
      console.error('[AnimePahe] Search error:', error);
      throw error;
    }
  }

  /**
   * Override fetchAnimeInfo to use Byparr
   */
  async fetchAnimeInfo(id: string): Promise<any> {
    try {
      const animeUrl = `${this.baseUrl}/anime/${id}`;
      const html = await this.fetchThroughByparr(animeUrl);

      // Parse the HTML to extract anime info
      const titleMatch = html.match(/<h1[^>]*>(.*?)<\/h1>/);
      const title = titleMatch ? titleMatch[1].replace(/<[^>]*>/g, '').trim() : 'Unknown';

      // Get episodes via API
      const episodesUrl = `${this.baseUrl}/api?m=release&id=${id}&sort=episode_asc&page=1`;
      const episodesHtml = await this.fetchThroughByparr(episodesUrl);

      let episodesJson = episodesHtml;
      const preMatch = episodesHtml.match(/<pre>(.*?)<\/pre>/s);
      if (preMatch) {
        episodesJson = preMatch[1];
      }

      const episodesData = JSON.parse(episodesJson);
      const episodes = episodesData.data?.map((ep: any, index: number) => ({
        id: ep.session,
        number: ep.episode || (index + 1),
        title: ep.title || `Episode ${ep.episode || (index + 1)}`,
        url: `${this.baseUrl}/play/${id}/${ep.session}`,
      })) || [];

      return {
        id: id,
        title: title,
        url: animeUrl,
        image: '', // Would need to parse from HTML
        description: '', // Would need to parse from HTML
        genres: [],
        totalEpisodes: episodes.length,
        episodes: episodes,
      };
    } catch (error) {
      console.error('[AnimePahe] fetchAnimeInfo error:', error);
      throw error;
    }
  }

  /**
   * Custom fetchEpisodeSources - simplified version without Kwik extraction
   * Returns direct Kwik URLs that the VideoPlayer can attempt to load
   */
  private async customFetchEpisodeSources(episodeId: string): Promise<any> {
    try {
      console.log(`[AnimePahe] ✅ NEW VERSION - Fetching sources for episode: ${episodeId}`);

      // Fetch the play page HTML
      const playUrl = `${this.baseUrl}/play/${episodeId}`;
      const html = await this.fetchThroughByparr(playUrl);

      console.log(`[AnimePahe] Got HTML, length: ${html.length}`);

      // Extract data-src URLs from resolution buttons
      const srcMatches = html.matchAll(/data-src="([^"]+)"/g);
      const qualityMatches = html.matchAll(/<button[^>]*data-src="[^"]*"[^>]*>([^<]+)</g);

      const sources = [];
      const srcArray = Array.from(srcMatches);
      const qualityArray = Array.from(qualityMatches);

      console.log(`[AnimePahe] Found ${srcArray.length} src matches`);

      for (let i = 0; i < srcArray.length; i++) {
        const url = srcArray[i][1];
        const quality = qualityArray[i]?.[1]?.trim() || `Quality ${i + 1}`;

        sources.push({
          url: url,
          quality: quality,
          isM3U8: url.includes('.m3u8'),
        });
      }

      console.log(`[AnimePahe] ✅ Returning ${sources.length} sources`);

      return {
        headers: {
          Referer: 'https://kwik.cx/',
        },
        sources: sources,
        download: sources[0]?.url || '',
      };
    } catch (error) {
      console.error('[AnimePahe] fetchEpisodeSources error:', error);
      throw error;
    }
  }

  /**
   * Override fetchEpisodeSources - simplified version without Kwik extraction
   * Returns direct Kwik URLs that the VideoPlayer can attempt to load
   */
  async fetchEpisodeSources(episodeId: string): Promise<any> {
    return this.customFetchEpisodeSources(episodeId);
  }
}

export default AnimePaheFixed;
