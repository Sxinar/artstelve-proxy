import type { NewsResult } from '../types.js';

export interface NewsEngine {
    id: string;
    search(params: { query: string; limit: number; signal?: AbortSignal }): Promise<NewsResult[]>;
}

async function trySerperNews(params: {
    query: string;
    limit: number;
    signal?: AbortSignal;
}): Promise<NewsResult[]> {
    const key = process.env.SERPER_API_KEY;
    if (!key) throw new Error('SERPER_API_KEY not set');

    const num = Math.max(1, Math.min(100, params.limit));
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    if (params.signal) params.signal.addEventListener('abort', () => controller.abort());

    const res = await fetch('https://google.serper.dev/news', {
        method: 'POST',
        headers: {
            'content-type': 'application/json',
            'x-api-key': key
        },
        body: JSON.stringify({ q: params.query, num }),
        signal: controller.signal
    });
    clearTimeout(t);

    const json = (await res.json().catch(() => null)) as
        | null
        | {
            news?: Array<{
                title?: string;
                link?: string;
                source?: string;
                date?: string;
                snippet?: string;
                imageUrl?: string;
            }>;
        };

    const news = json?.news ?? [];
    const out: NewsResult[] = [];

    for (const article of news) {
        const title = (article.title ?? '').trim();
        const url = (article.link ?? '').trim();
        const source = (article.source ?? '').trim();

        if (!title || !url || !source) continue;

        out.push({
            engine: 'google-news',
            title,
            url,
            source,
            publishDate: article.date,
            snippet: article.snippet,
            imageUrl: article.imageUrl
        });

        if (out.length >= params.limit) break;
    }

    return out;
}

export const googleNews: NewsEngine = {
    id: 'google-news',
    async search({ query, limit, signal }) {
        const results = await trySerperNews({ query, limit, signal });
        if (results.length === 0) {
            throw new Error('no_results_or_serper_api_error');
        }
        return results;
    }
};
