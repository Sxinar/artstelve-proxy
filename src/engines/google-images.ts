import * as cheerio from 'cheerio';
import type { ImageResult } from '../types.js';

export interface ImageEngine {
  id: string;
  search(params: { query: string; limit: number; pageno?: number; signal?: AbortSignal }): Promise<ImageResult[]>;
}

/**
 * BING IMAGES ENGINE
 * Doğrudan HTML scraping ile çalışır.
 */
export const bingImages: ImageEngine = {
  id: 'bing-images',
  async search({ query, limit, pageno, signal }) {
    const first = ((pageno || 1) - 1) * limit;
    const url = `https://www.bing.com/images/search?q=${encodeURIComponent(query)}&first=${first}`;
    
    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9'
      },
      signal
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const out: ImageResult[] = [];

    $('.iusc').each((_, el) => {
      const m = $(el).attr('m');
      if (m) {
        try {
          const data = JSON.parse(m);
          out.push({
            engine: 'bing-images',
            title: data.t || '',
            url: data.murl,
            thumbnail: data.turl,
            source: data.purl
          });
        } catch (e) {}
      }
    });
    return out;
  }
};

/**
 * YANDEX IMAGES ENGINE
 * Doğrudan HTML scraping ile çalışır.
 */
export const yandexImages: ImageEngine = {
  id: 'yandex-images',
  async search({ query, limit, pageno, signal }) {
    const p = (pageno || 1) - 1;
    const url = `https://yandex.com.tr/gorsel/search?text=${encodeURIComponent(query)}&p=${p}`;

    const res = await fetch(url, {
      headers: { 
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.2 Mobile/15E148 Safari/604.1',
        'Accept-Language': 'tr-TR,tr;q=0.9',
        'Referer': 'https://yandex.com.tr/'
      },
      signal
    });

    const html = await res.text();
    const $ = cheerio.load(html);
    const out: ImageResult[] = [];

    $('.serp-item').each((_, el) => {
      const dataBem = $(el).attr('data-bem');
      if (dataBem) {
        try {
          const data = JSON.parse(dataBem)['serp-item'];
          out.push({
            engine: 'yandex-images',
            title: data.snippet?.title || '',
            url: data.img_href,
            thumbnail: data.thumb?.url,
            source: data.snippet?.url,
            width: data.w,
            height: data.h
          });
        } catch (e) {}
      }
    });
    return out;
  }
};

/**
 * META IMAGE ENGINE
 * Bing ve Yandex'i birleştirir, duplicate'leri siler.
 */
export const metaImageEngine: ImageEngine = {
  id: 'meta-images',
  async search({ query, limit, pageno, signal }) {
    // İki motoru paralel olarak başlat
    const [bingRes, yandexRes] = await Promise.allSettled([
      bingImages.search({ query, limit, pageno, signal }),
      yandexImages.search({ query, limit, pageno, signal })
    ]);

    let combined: ImageResult[] = [];

    // Başarılı olan sonuçları ekle
    if (bingRes.status === 'fulfilled') combined.push(...bingRes.value);
    if (yandexRes.status === 'fulfilled') combined.push(...yandexRes.value);

    // --- DUPLICATE (MÜKERRER) TEMİZLEME ---
    const seenUrls = new Set<string>();
    const uniqueResults = combined.filter((item) => {
      const url = item.url.toLowerCase().trim();
      if (seenUrls.has(url)) return false;
      seenUrls.add(url);
      return true;
    });

    if (uniqueResults.length === 0) {
      throw new Error('no_results_or_scraping_error');
    }

    return uniqueResults.slice(0, limit);
  }
};
  
