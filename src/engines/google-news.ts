import * as cheerio from 'cheerio';
import type { NewsResult } from '../types.js';

export interface NewsEngine {
    id: string;
    search(params: { query: string; limit: number; pageno?: number; signal?: AbortSignal }): Promise<NewsResult[]>;
}

// --- BING NEWS SCRAPER ---
async function scrapeBingNews(query: string, limit: number, pageno: number, signal?: AbortSignal): Promise<NewsResult[]> {
    const first = (pageno - 1) * limit;
    const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&first=${first}`;
    
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36' },
        signal
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: NewsResult[] = [];

    $('.news-card').each((_, el) => {
        const title = $(el).find('.title').text().trim();
        const url = $(el).find('.title').attr('href') || '';
        const source = $(el).find('.source').text().trim();
        const snippet = $(el).find('.snippet').text().trim();
        const date = $(el).find('.time').text().trim();
        const imageUrl = $(el).find('img').attr('src') || '';

        if (title && url) {
            results.push({
                engine: 'bing-news',
                title,
                url,
                source,
                publishDate: date,
                snippet,
                imageUrl: imageUrl.startsWith('http') ? imageUrl : undefined
            });
        }
    });
    return results;
}

// --- YAHOO NEWS SCRAPER ---
async function scrapeYahooNews(query: string, pageno: number, signal?: AbortSignal): Promise<NewsResult[]> {
    const offset = (pageno - 1) * 10 + 1;
    const url = `https://news.search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${offset}`;
    
    const res = await fetch(url, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36' },
        signal
    });
    
    const html = await res.text();
    const $ = cheerio.load(html);
    const results: NewsResult[] = [];

    $('.NewsArticle').each((_, el) => {
        const title = $(el).find('h4.s-title').text().trim();
        const url = $(el).find('h4.s-title a').attr('href') || '';
        const source = $(el).find('span.s-source').text().trim();
        const snippet = $(el).find('p.s-desc').text().trim();
        const date = $(el).find('span.s-time').text().trim();
        const imageUrl = $(el).find('img.s-img').attr('src') || $(el).find('img.s-img').attr('data-src') || '';

        if (title && url) {
            results.push({
                engine: 'yahoo-news',
                title,
                url,
                source,
                publishDate: date,
                snippet,
                imageUrl: imageUrl.startsWith('http') ? imageUrl : undefined
            });
        }
    });
    return results;
}

// --- ANA EXPORT ---
export const googleNews: NewsEngine = {
    id: 'google-news',
    async search({ query, limit, pageno = 1, signal }) {
        // İki kaynağı paralel çalıştırarak hızı ve çeşitliliği artırıyoruz
        const [bingRes, yahooRes] = await Promise.allSettled([
            scrapeBingNews(query, limit, pageno, signal),
            scrapeYahooNews(query, pageno, signal)
        ]);

        let combined: NewsResult[] = [];
        if (bingRes.status === 'fulfilled') combined.push(...bingRes.value);
        if (yahooRes.status === 'fulfilled') combined.push(...yahooRes.value);

        // --- DUPLICATE KONTROLÜ ---
        const seen = new Set<string>();
        const unique = combined.filter(article => {
            const cleanUrl = article.url.split('?')[0].toLowerCase().trim();
            if (seen.has(cleanUrl)) return false;
            seenUrls.add(cleanUrl); // Not: Yukarıda tanımlanan 'seen' kümesi
            return true;
        });

        // Hata Düzeltmesi: 'seenUrls' yerine 'seen' kullanmalısın
        const finalResults = combined.filter(article => {
            const id = article.url.split('?')[0].toLowerCase();
            return seen.has(id) ? false : seen.add(id);
        });

        if (finalResults.length === 0) {
            throw new Error('no_news_results_found');
        }

        return finalResults.slice(0, limit);
    }
};
