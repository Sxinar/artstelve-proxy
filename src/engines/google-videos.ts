import type { VideoResult } from '../types.js';

export interface VideoEngine {
    id: string;
    search(params: { query: string; limit: number; signal?: AbortSignal }): Promise<VideoResult[]>;
}

async function trySerperVideos(params: {
    query: string;
    limit: number;
    signal?: AbortSignal;
}): Promise<VideoResult[]> {
    const key = process.env.SERPER_API_KEY;
    if (!key) throw new Error('SERPER_API_KEY not set');

    const num = Math.max(1, Math.min(100, params.limit));
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), 8000);
    if (params.signal) params.signal.addEventListener('abort', () => controller.abort());

    const res = await fetch('https://google.serper.dev/videos', {
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
            videos?: Array<{
                title?: string;
                link?: string;
                imageUrl?: string;
                duration?: string;
                channel?: string;
                date?: string;
            }>;
        };

    const videos = json?.videos ?? [];
    const out: VideoResult[] = [];

    for (const vid of videos) {
        const title = (vid.title ?? '').trim();
        const url = (vid.link ?? '').trim();
        const thumbnail = (vid.imageUrl ?? '').trim();

        if (!title || !url) continue;

        out.push({
            engine: 'google-videos',
            title,
            url,
            thumbnail,
            duration: vid.duration,
            channel: vid.channel,
            uploadDate: vid.date
        });

        if (out.length >= params.limit) break;
    }

    return out;
}

export const googleVideos: VideoEngine = {
    id: 'google-videos',
    async search({ query, limit, signal }) {
        const results = await trySerperVideos({ query, limit, signal });
        if (results.length === 0) {
            throw new Error('no_results_or_serper_api_error');
        }
        return results;
    }
};
