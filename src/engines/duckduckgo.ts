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
    'verify',
    'robot',
    'consent',
    'blocked',
    'access denied',
    'enable javascript',
    'attention required',
    'cloudflare',
    'temporarily unavailable',
    'service unavailable'
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

export const duckduckgo: Engine = {
  id: 'duckduckgo',
  async search({ query, limit, signal }) {
    const reqUrl = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
    const { html, url, status } = await fetchHtml(reqUrl, { signal, timeoutMs: 20000 });
    const $ = loadHtml(html);

    const results: SearchResult[] = [];

    const primary = $('a.result-link')
      .toArray()
      .map((el: AnyNode) => {
        const a = $(el);
        const title = (a.text() || '').trim();
        const href = (a.attr('href') || '').trim();
        const row = a.closest('tr');
        const snippet = (row.find('td.result-snippet').text() || '').trim();
        return { title, url: href, snippet };
      });

    const items = primary.length
      ? primary
      : $('table a[href]')
          .toArray()
          .map((el: AnyNode) => {
            const a = $(el);
            const title = (a.text() || '').trim();
            const href = (a.attr('href') || '').trim();
            const row = a.closest('tr');
            const snippet = (row.find('td.result-snippet').text() || '').trim();
            return { title, url: href, snippet };
          })
          .filter((x: { title: string; url: string; snippet: string }) => x.title.length > 0 && x.url.length > 0);

    for (const it of items) {
      if (!it.title || !it.url) continue;
      results.push({ engine: 'duckduckgo', title: it.title, url: it.url, snippet: it.snippet || undefined });
      if (results.length >= limit) break;
    }

    await assertNotBlockedOrEmpty({ url, html, count: results.length, status });
    return results;
  }
};
