import type { Engine } from './engine.js';
import type { SearchResult } from '../types.js';
import { fetchHtml } from '../http/fetchHtml.js';
import { loadHtml } from '../html/load.js';
import type { AnyNode } from 'domhandler';

async function assertNotBlockedOrEmpty(params: { url: string; html: string; count: number; status: number }): Promise<void> {
  if (params.count > 0) return;
  const hay = `${params.url}\n${params.html}`.toLowerCase();
  const blockedHints = [
    'captcha',
    'unusual traffic',
    'our systems have detected unusual traffic',
    'sorry',
    '/sorry/',
    'enable javascript',
    'consent',
    'before you continue',
    'access denied',
    'verify'
  ];
  const isBlocked = blockedHints.some((h) => hay.includes(h));
  const snippet = params.html.replace(/\s+/g, ' ').slice(0, 220);
  if (isBlocked || params.status === 403 || params.status === 429)
    throw new Error(
      `blocked_or_captcha status=${params.status} url=${JSON.stringify(params.url)} html_snippet=${JSON.stringify(snippet)}`
    );
  throw new Error(
    `no_results_or_selector_mismatch status=${params.status} url=${JSON.stringify(params.url)} html_snippet=${JSON.stringify(snippet)}`
  );
}

async function trySerper(params: {
  query: string;
  limit: number;
  pageno?: number;
  signal?: AbortSignal;
}): Promise<SearchResult[] | null> {
  const key = process.env.SERPER_API_KEY;
  if (!key) throw new Error('SERPER_API_KEY not set');

  const num = Math.max(1, Math.min(20, params.limit));
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 6000);
  if (params.signal) params.signal.addEventListener('abort', () => controller.abort());
  const res = await fetch('https://google.serper.dev/search', {
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
      organic?: Array<{ title?: string; link?: string; snippet?: string }>;
    };

  const organic = json?.organic ?? [];
  const out: SearchResult[] = [];
  for (const r of organic) {
    const title = (r.title ?? '').trim();
    const url = (r.link ?? '').trim();
    const snippet = (r.snippet ?? '').trim();
    if (!title || !url) continue;
    out.push({ engine: 'google', title, url, snippet: snippet || undefined });
    if (out.length >= params.limit) break;
  }
  return out;
}

function cleanGoogleRedirect(href: string): string {
  try {
    if (!href) return '';
    if (href.startsWith('/url?')) {
      const u = new URL(href, 'https://www.google.com');
      const q = u.searchParams.get('q') || u.searchParams.get('url') || '';
      return q;
    }
    if (href.startsWith('http://') || href.startsWith('https://')) return href;
    return '';
  } catch {
    return '';
  }
}

function isProbablyResultUrl(url: string): boolean {
  try {
    if (!url) return false;
    const u = new URL(url);
    const host = u.hostname.toLowerCase().replace(/^www\./, '');
    if (host.endsWith('google.com') || host.endsWith('googleusercontent.com')) return false;
    return true;
  } catch {
    return false;
  }
}

export const google: Engine = {
  id: 'google',
  async search({ query, limit, pageno, signal }) {
    const results = await trySerper({ query, limit, pageno, signal });
    if (!results || results.length === 0) {
      throw new Error('no_results_or_serper_api_error');
    }
    return results;
  }
};
