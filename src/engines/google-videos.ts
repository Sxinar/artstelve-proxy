import * as cheerio from 'cheerio';
import type { VideoResult } from '../types.js';

export interface VideoEngine {
    id: string;
    search(params: { query: string; limit: number; pageno?: number; signal?: AbortSignal }): Promise<VideoResult[]>;
}

// --- 1. YANDEX VIDEOS (En geniş kapsamlı) ---
async function scrapeYandexVideos(query: string, pageno: number, signal?: AbortSignal): Promise<VideoResult[]> {
    try {
        const url = `https://yandex.com.tr/video/search?text=${encodeURIComponent(query)}&p=${pageno - 1}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_8 like Mac OS X) AppleWebKit/605.1.15' },
            signal
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        const results: VideoResult[] = [];

        $('.serp-item').each((_, el) => {
            const dataBem = $(el).attr('data-bem');
            if (dataBem) {
                const data = JSON.parse(dataBem)['serp-item'];
                results.push({
                    engine: 'google-videos',
                    title: data.title,
                    url: data.url,
                    thumbnail: data.thumbHtml ? $(data.thumbHtml).attr('src') : data.previewUrl,
                    duration: data.duration,
                    channel: data.sourceName,
                    uploadDate: data.modTime
                });
            }
        });
        return results;
    } catch { return []; }
}

// --- 2. BING VIDEOS (En stabil veri) ---
async function scrapeBingVideos(query: string, limit: number, pageno: number, signal?: AbortSignal): Promise<VideoResult[]> {
    try {
        const first = (pageno - 1) * limit;
        const url = `https://www.bing.com/videos/search?q=${encodeURIComponent(query)}&first=${first}`;
        const res = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
            signal
        });
        const html = await res.text();
        const $ = cheerio.load(html);
        const results: VideoResult[] = [];

        $('.dg_u').each((_, el) => {
            const title = $(el).find('.mc_vtvc_title').text().trim();
            const link = $(el).find('a').attr('href') || '';
            if (title && link) {
                results.push({
                    engine: 'google-videos',
                    title,
                    url: link.startsWith('http') ? link : `https://www.bing.com${link}`,
                    thumbnail: $(el).find('img').attr('src') || '',
                    duration: $(el).find('.vtvc_v_dur').text().trim(),
                    channel: $(el).find('.mc_vtvc_meta_row:first-child').text().trim()
                });
            }
        });
        return results;
    } catch { return []; }
}

// --- 3. SWISSCOWS VIDEOS (Temiz HTML) ---
async function scrapeSwisscowsVideos(query: string, pageno: number, signal?: AbortSignal): Promise<VideoResult[]> {
    try {
        const url = `https://swisscows.com/en/video?query=${encodeURIComponent(query)}&offset=${(pageno - 1) * 10}`;
        const res = await fetch(url, { signal });
        const html = await res.text();
        const $ = cheerio.load(html);
        const results: VideoResult[] = [];

        $('.article.video').each((_, el) => {
            results.push({
                engine: 'google-videos',
                title: $(el).find('.title').text().trim(),
                url: $(el).find('a').attr('href') || '',
                thumbnail: $(el).find('img').attr('src') || '',
                duration: $(el).find('.duration').text().trim(),
                channel: $(el).find('.source').text().trim()
            });
        });
        return results;
    } catch { return []; }
}

export const googleVideos: VideoEngine = {
    id: 'google-videos',
    async search({ query, limit, pageno = 1, signal }) {
        const [yandexRes, bingRes, swissRes] = await Promise.allSettled([
            scrapeYandexVideos(query, pageno, signal),
            scrapeBingVideos(query, limit, pageno, signal),
            scrapeSwisscowsVideos(query, pageno, signal)
        ]);

        let combined: VideoResult[] = [];
        [yandexRes, bingRes, swissRes].forEach(res => {
            if (res.status === 'fulfilled') combined.push(...res.value);
        });

        // --- GELİŞMİŞ DUPLICATE FİLTRESİ ---
        const seen = new Set<string>();
        const finalResults = combined.filter(vid => {
            // YouTube videolarında ID'yi ayıklayarak eşleştirme yapalım
            let id = vid.url.toLowerCase().trim();
            if (id.includes('youtube.com/watch?v=')) {
                id = id.split('v=')[1]?.split('&')[0] || id;
            } else if (id.includes('youtu.be/')) {
                id = id.split('be/')[1]?.split('?')[0] || id;
            }
            
            if (seen.has(id)) return false;
            seen.add(id);
            return true;
        });

        if (finalResults.length === 0) throw new Error('no_video_results_found');
        return finalResults.slice(0, limit);
    }
};
