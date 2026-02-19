import * as cheerio from 'cheerio';
import type { NewsResult } from '../types.js';

export interface NewsEngine {
    id: string;
    search(params: { query: string; limit: number; pageno?: number; signal?: AbortSignal }): Promise<NewsResult[]>;
}

/**
 * BING NEWS SCRAPER
 */
export const bingNews: NewsEngine = {
    id: 'bing-news',
    async search({ query, limit, pageno, signal }) {
        const first = ((pageno || 1) - 1) * limit;
        const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&first=${first}`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8'
            },
            signal
        });

        const html = await res.text();
        const $ = cheerio.load(html);
        const out: NewsResult[] = [];

        $('.news-card').each((_, el) => {
            if (out.length >= limit) return;
            
            const title = $(el).find('.title').text().trim();
            const url = $(el).find('.title').attr('href') || '';
            const source = $(el).find('.source').text().trim();
            const snippet = $(el).find('.snippet').text().trim();
            const date = $(el).find('.time').text().trim();
            const imageUrl = $(el).find('img').attr('src') || '';

            if (title && url) {
                out.push({
                    engine: 'bing-news',
                    title,
                    url,
                    source,
                    publishDate: date,
                    snippet,
                    imageUrl
                });
            }
        });

        return out;
    }
};

/**
 * YAHOO NEWS SCRAPER
 */
export const yahooNews: NewsEngine = {
    id: 'yahoo-news',
    async search({ query, limit, pageno, signal }) {
        // Yahoo News araması için pageno genellikle b= parametresiyle (offset) kontrol edilir
        const offset = ((pageno || 1) - 1) * 10 + 1;
        const url = `https://news.search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${offset}`;

        const res = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
            },
            signal
        });

        const html = await res.text();
        const $ = cheerio.load(html);
        const out: NewsResult[] = [];

        $('.NewsArticle').each((_, el) => {
            if (out.length >= limit) return;

            const title = $(el).find('h4.s-title').text().trim();
            const url = $(el).find('h4.s-title a').attr('href') || '';
            const source = $(el).find('span.s-source').text().trim();
            const snippet = $(el).find('p.s-desc').text().trim();
            const date = $(el).find('span.s-time').text().trim();
            
            // Yahoo bazen görselleri lazy-load yapar, o yüzden 'src' veya 'data-src' kontrolü
            let imageUrl = $(el).find('img.s-img').attr('src') || $(el).find('img.s-img').attr('data-src') || '';

            if (title && url) {
                out.push({
                    engine: 'yahoo-news',
                    title,
                    url,
                    source,
                    publishDate: date,
                    snippet,
                    imageUrl
                });
            }
        });

        return out;
    }
};

/**
 * META NEWS ENGINE (Birleştirici)
 */
export const metaNewsEngine: NewsEngine = {
    id: 'meta-news',
    async search({ query, limit, pageno, signal }) {
        const [bingRes, yahooRes] = await Promise.allSettled([
            bingNews.search({ query, limit, pageno, signal }),
            yahooNews.search({ query, limit, pageno, signal })
        ]);

        let combined: NewsResult[] = [];
        if (bingRes.status === 'fulfilled') combined.push(...bingRes.value);
        if (yahooRes.status === 'fulfilled') combined.push(...yahooRes.status === 'fulfilled' ? yahooRes.value : []);

        // --- DUPLICATE (MÜKERRER) KONTROLÜ ---
        const seenUrls = new Set<string>();
        const uniqueNews = combined.filter((article) => {
            // URL içindeki gereksiz parametreleri temizleyerek karşılaştır
            const cleanUrl = article.url.split('?')[0].toLowerCase().trim();
            if (seenUrls.has(cleanUrl)) return false;
            seenUrls.add(cleanUrl);
            return true;
        });

        if (uniqueNews.length === 0) {
            throw new Error('no_news_results_found');
        }

        return uniqueNews.slice(0, limit);
    }
};
