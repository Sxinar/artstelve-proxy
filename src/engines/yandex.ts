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
    'cloudflare',
    'attention required'
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

export const yandex: Engine = {
  id: 'yandex',
  async search({ query, limit, signal }) {
    const reqUrl = `https://yandex.com/search/?text=${encodeURIComponent(query)}`;
    const { html, url, status } = await fetchHtml(reqUrl, { signal, timeoutMs: 20000 });
    const $ = loadHtml(html);

    const results: SearchResult[] = [];
    const nodes = $('li.serp-item, div.serp-item').toArray();
    for (const el of nodes) {
      const n = $(el as AnyNode);
      const a = n.find('a.Link[href]').first();
      const titleEl = n.find('h2').first();
      const title = ((titleEl.text() || a.text()) || '').trim();
      const hrefRaw = (a.attr('href') || '').trim();
      const href = hrefRaw ? new URL(hrefRaw, url).toString() : '';
      const snippet = (n.find('.OrganicTextContentSpan, .text-container').first().text() || '').trim();
      if (!title || !href) continue;
      results.push({ engine: 'yandex', title, url: href, snippet: snippet || undefined });
      if (results.length >= limit) break;
    }

    await assertNotBlockedOrEmpty({ url, html, count: results.length, status });
    return results;
  }
};
