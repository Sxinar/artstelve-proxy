import type { Engine } from './engine.js';
import { newContext } from '../browserPool.js';
import type { SearchResult } from '../types.js';
import { gotoWithRetries } from '../pageFetch.js';

export const aol: Engine = {
  id: 'aol',
  async search({ query, limit, signal }) {
    const ctx = await newContext();
    const page = await ctx.newPage();

    try {
      const url = `https://search.aol.com/aol/search?q=${encodeURIComponent(query)}`;
      await gotoWithRetries(page, url, { signal });

      const items = await page.$$eval('div#web li div.algo', (nodes: Element[]) =>
        nodes.map((n) => {
          const a = n.querySelector('h3.title a') as HTMLAnchorElement | null;
          const s = n.querySelector('div.compText p') as HTMLElement | null;
          return {
            title: (a?.textContent || '').trim(),
            url: a?.href || '',
            snippet: (s?.textContent || '').trim()
          };
        })
      );

      const results: SearchResult[] = [];
      for (const it of items) {
        if (!it.title || !it.url) continue;
        results.push({ engine: 'aol', title: it.title, url: it.url, snippet: it.snippet || undefined });
        if (results.length >= limit) break;
      }
      return results;
    } finally {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
    }
  }
};
