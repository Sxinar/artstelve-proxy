import type { Engine } from './engine.js';
import { newContext } from '../browserPool.js';
import type { SearchResult } from '../types.js';
import { gotoWithRetries } from '../pageFetch.js';

async function assertNotBlockedOrEmpty(page: import('playwright').Page, count: number): Promise<void> {
  if (count > 0) return;
  const title = (await page.title().catch(() => '')) || '';
  const url = page.url();
  const html = (await page.content().catch(() => '')) || '';
  const hay = `${title}\n${url}\n${html}`.toLowerCase();
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
  const snippet = html.replace(/\s+/g, ' ').slice(0, 220);
  if (isBlocked)
    throw new Error(
      `blocked_or_captcha title=${JSON.stringify(title)} url=${JSON.stringify(url)} html_snippet=${JSON.stringify(snippet)}`
    );
  throw new Error(
    `no_results_or_selector_mismatch title=${JSON.stringify(title)} url=${JSON.stringify(url)} html_snippet=${JSON.stringify(snippet)}`
  );
}

export const duckduckgo: Engine = {
  id: 'duckduckgo',
  async search({ query, limit, signal }) {
    const ctx = await newContext();
    const page = await ctx.newPage();

    try {
      const url = `https://lite.duckduckgo.com/lite/?q=${encodeURIComponent(query)}`;
      await gotoWithRetries(page, url, { signal });

      await page.waitForSelector('a.result-link', { timeout: 15000 }).catch(() => {});

      let items = await page.$$eval('a.result-link', (nodes: Element[]) =>
        nodes.map((aEl) => {
          const a = aEl as HTMLAnchorElement;
          const row = a.closest('tr') as HTMLTableRowElement | null;
          const snippetCell = row?.querySelector('td.result-snippet') as HTMLElement | null;
          return {
            title: (a.textContent || '').trim(),
            url: a.href || '',
            snippet: (snippetCell?.textContent || '').trim()
          };
        })
      );

      if (items.length === 0) {
        items = await page.$$eval('table a[href]', (nodes: Element[]) =>
          nodes
            .map((aEl) => {
              const a = aEl as HTMLAnchorElement;
              const row = a.closest('tr') as HTMLTableRowElement | null;
              const snippetCell = row?.querySelector('td.result-snippet') as HTMLElement | null;
              return {
                title: (a.textContent || '').trim(),
                url: a.href || '',
                snippet: (snippetCell?.textContent || '').trim()
              };
            })
            .filter((x) => x.title.length > 0 && x.url.length > 0)
        );
      }

      const results: SearchResult[] = [];
      for (const it of items) {
        if (!it.title || !it.url) continue;
        results.push({ engine: 'duckduckgo', title: it.title, url: it.url, snippet: it.snippet || undefined });
        if (results.length >= limit) break;
      }

      await assertNotBlockedOrEmpty(page, results.length);
      return results;
    } finally {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
    }
  }
};
