import { CookieJar } from './cookieJar.js';

export type FetchHtmlResult = {
  url: string;
  status: number;
  html: string;
  headers: Headers;
};

const defaultUserAgent =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const globalJar = new CookieJar();

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new Error('aborted'));
    const t = setTimeout(resolve, ms);
    if (signal) {
      signal.addEventListener(
        'abort',
        () => {
          clearTimeout(t);
          reject(new Error('aborted'));
        },
        { once: true }
      );
    }
  });
}

export async function fetchHtml(
  url: string,
  opts?: {
    signal?: AbortSignal;
    timeoutMs?: number;
    jar?: CookieJar;
    headers?: Record<string, string>;
  }
): Promise<FetchHtmlResult> {
  const jar = opts?.jar ?? globalJar;
  const timeoutMs = Math.max(2000, Math.min(25000, opts?.timeoutMs ?? 15000));

  const maxAttempts = 2;
  let lastErr: unknown;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    const signal = opts?.signal;
    const onAbort = () => controller.abort();
    if (signal) signal.addEventListener('abort', onAbort, { once: true });

    try {
      const headers = new Headers({
        'user-agent': defaultUserAgent,
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.9',
        'cache-control': 'no-cache',
        pragma: 'no-cache',
        ...(opts?.headers ?? {})
      });

      const cookie = jar.headerFor(url);
      if (cookie) headers.set('cookie', cookie);

      const res = await fetch(url, {
        method: 'GET',
        redirect: 'follow',
        headers,
        signal: controller.signal
      });

      jar.setFromResponse(res.url, res.headers);

      const html = await res.text();
      clearTimeout(t);
      if (signal) signal.removeEventListener('abort', onAbort);

      return { url: res.url, status: res.status, html, headers: res.headers };
    } catch (e) {
      clearTimeout(t);
      if (signal) signal.removeEventListener('abort', onAbort);
      lastErr = e;

      if (opts?.signal?.aborted) throw new Error('aborted');
      if (attempt < maxAttempts - 1) {
        await sleep(400 + attempt * 500, opts?.signal).catch(() => {});
        continue;
      }
    }
  }

  throw lastErr instanceof Error ? lastErr : new Error('fetch failed');
}
