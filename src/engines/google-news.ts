import * as cheerio from 'cheerio';
import type { NewsResult } from '../types.js';

export interface NewsEngine {
    id: string;
    search(params: { query: string; limit: number; pageno?: number; signal?: AbortSignal }): Promise<NewsResult[]>;
}

/**
 * BING NEWS - En stabil haber kaynağı
 */
async function scrapeBingNews(query: string, limit: number, pageno: number, signal?: AbortSignal): Promise<NewsResult[]> {
    try {
        const first = (pageno - 1) * limit;
        const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&first=${first}`;
        
        const res = await fetch(url, {
            headers: { 
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8'
            },
            signal
        });
        
        if (!res.ok) return [];
        const html = await res.text();
        const $ = cheerio.load(html);
        const results: NewsResult[] = [];

        $('.news-card').each((_, el) => {
            const title = $(el).find('.title').text().trim();
            const url = $(el).find('.title').attr('href') || '';
            const source = $(el).find('.source').text().trim();
            const snippet = $(el).find('.snippet').text().trim() || $(el).find('.p1').text().trim();
            const date = $(el).find('.time').text().trim();
            const imageUrl = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';

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
    } catch (e) {
        return [];
    }
}

/**
 * ANA EXPORT - Google News ismiyle servislerine bağlanır
 */
export const googleNews: NewsEngine = {
    id: 'google-news',
    async search({ query, limit, pageno = 1, signal }) {
        // Şu an için en stabil olan Bing üzerinden çekiyoruz. 
        // Yahoo eklenebilir ama genelde Cloudflare/Bot engelini aşmak zordur.
        const results = await scrapeBingNews(query, limit, pageno, signal);

        // --- DUPLICATE KONTROLÜ ---
        const seen = new Set<string>();
        const finalResults = results.filter(article => {
            // URL'deki query params'ları temizleerek karşılaştırıyoruz
            const id = article.url.split('?')[0].toLowerCase().trim();
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        if (finalResults.length === 0) {
            // Eğer hiçbir sonuç gelmezse hata fırlatmak yerine boş dizi döndürmek 
            // bazen frontend'in çökmesini engeller ama senin yapına göre Error fırlatıyorum:
            throw new Error('no_news_results_found');
        }

        return finalResults.slice(0, limit);
    }
};
