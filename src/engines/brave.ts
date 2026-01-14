import type { Engine } from './engine.js';
import { newContext } from '../browserPool.js';
import type { SearchResult } from '../types.js';
import { gotoWithRetries } from '../pageFetch.js';

export const brave: Engine = {
  id: 'brave',
  async search({ query, limit, signal }) {
    const ctx = await newContext();
    const page = await ctx.newPage();

    try {
      const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;
      await gotoWithRetries(page, url, { signal });

      const items = await page.$$eval('div#results .snippet, div.snippet', (nodes: Element[]) =>
        nodes.map((n) => {
          const a = n.querySelector('a[href]') as HTMLAnchorElement | null;
          const titleEl = n.querySelector('a[href] .title, .title') as HTMLElement | null;
          const s = n.querySelector('.snippet-description, .description') as HTMLElement | null;
          return {
            title: (titleEl?.textContent || a?.textContent || '').trim(),
            url: a?.href || '',
            snippet: (s?.textContent || '').trim()
          };
        })
      );

      const results: SearchResult[] = [];
      for (const it of items) {
        if (!it.title || !it.url) continue;
        results.push({ engine: 'brave', title: it.title, url: it.url, snippet: it.snippet || undefined });
        if (results.length >= limit) break;
      }
      return results;
    } finally {
      await page.close().catch(() => {});
      await ctx.close().catch(() => {});
    }
  }
};
