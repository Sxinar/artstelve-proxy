import type { ImageResult } from '../types.js';

export interface ImageEngine {
  id: string;
  search(params: { query: string; limit: number; pageno?: number; signal?: AbortSignal }): Promise<ImageResult[]>;
}

async function trySerperImages(params: {
  query: string;
  limit: number;
  pageno?: number;
  signal?: AbortSignal;
}): Promise<ImageResult[]> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error('SERPER_API_KEY not set');

  const num = Math.max(1, Math.min(100, params.limit));
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 8000);
  if (params.signal) params.signal.addEventListener('abort', () => controller.abort());

  const res = await fetch('https://google.serper.dev/images', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': key
    },
    body: JSON.stringify({ q: params.query, num, page: params.pageno || 1 }),
    signal: controller.signal
  });
  clearTimeout(t);

  const json = (await res.json().catch(() => null)) as
    | null
    | {
      images?: Array<{
        title?: string;
        imageUrl?: string;
        thumbnailUrl?: string;
        imageWidth?: number;
        imageHeight?: number;
        source?: string;
      }>;
    };

  const images = json?.images ?? [];
  const out: ImageResult[] = [];

  for (const img of images) {
    const title = (img.title ?? '').trim();
    const url = (img.imageUrl ?? '').trim();
    const thumbnail = (img.thumbnailUrl ?? url).trim();

    if (!title || !url) continue;

    out.push({
      engine: 'google-images',
      title,
      url,
      thumbnail,
      width: img.imageWidth,
      height: img.imageHeight,
      source: img.source
    });

    if (out.length >= params.limit) break;
  }

  return out;
}

export const googleImages: ImageEngine = {
  id: 'google-images',
  async search({ query, limit, pageno, signal }) {
    const results = await trySerperImages({ query, limit, pageno, signal });
    if (results.length === 0) {
      throw new Error('no_results_or_serper_api_error');
    }
    return results;
  }
};
