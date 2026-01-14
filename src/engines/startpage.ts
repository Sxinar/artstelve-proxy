import type { Engine } from './engine.js';
import { newContext } from '../browserPool.js';
import type { SearchResult } from '../types.js';
import { gotoWithRetries } from '../pageFetch.js';

export const startpage: Engine = {
  id: 'startpage',
  async search({ query, limit, signal }) {
    const ctx = await newContext();
    const page = await ctx.newPage();

    try {
      const url = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
      await gotoWithRetries(page, url, { signal });

      const items = await page.$$eval('div.w-gl__result, .w-gl__result', (nodes: Element[]) =>
        nodes.map((n) => {
          const a = n.querySelector('a.w-gl__result-title, a[href]') as HTMLAnchorElement | null;
          const s = n.querySelector('.w-gl__description, p') as HTMLElement | null;
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
        results.push({ engine: 'startpage', title: it.title, url: it.url, snippet: it.snippet || undefined });
        if (results.length >= limit) break;
      }
      return results;
    } finally {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
    }
  }
};
