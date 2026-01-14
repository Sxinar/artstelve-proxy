import type { Engine } from './engine.js';
import { newContext } from '../browserPool.js';
import type { SearchResult } from '../types.js';
import { gotoWithRetries } from '../pageFetch.js';

export const qwant: Engine = {
  id: 'qwant',
  async search({ query, limit, signal }) {
    const ctx = await newContext();
    const page = await ctx.newPage();

    try {
      const url = `https://www.qwant.com/?q=${encodeURIComponent(query)}&t=web`;
      await gotoWithRetries(page, url, { signal });

      const items = await page.$$eval(
        'a[data-testid="webResult-link"], a[href][data-testid*="result"]',
        (nodes: Element[]) =>
          nodes.map((aEl) => {
            const link = aEl as HTMLAnchorElement;
          const container = link.closest('article, li, div') as HTMLElement | null;
          const titleEl = container?.querySelector('h2, h3') as HTMLElement | null;
          const s = container?.querySelector('p') as HTMLElement | null;
          return {
            title: (titleEl?.textContent || link.textContent || '').trim(),
            url: link.href || '',
            snippet: (s?.textContent || '').trim()
          };
          })
      );

      const results: SearchResult[] = [];
      for (const it of items) {
        if (!it.title || !it.url) continue;
        results.push({ engine: 'qwant', title: it.title, url: it.url, snippet: it.snippet || undefined });
        if (results.length >= limit) break;
      }
      return results;
    } finally {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
    }
  }
};
