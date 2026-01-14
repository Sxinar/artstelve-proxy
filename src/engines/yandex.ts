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
  const blockedHints = ['captcha', 'unusual traffic', 'verify', 'robot', 'consent', 'blocked', 'access denied'];
  const isBlocked = blockedHints.some((h) => hay.includes(h));
  if (isBlocked) throw new Error(`blocked_or_captcha title=${JSON.stringify(title)} url=${JSON.stringify(url)}`);
  throw new Error(`no_results_or_selector_mismatch title=${JSON.stringify(title)} url=${JSON.stringify(url)}`);
}

export const yandex: Engine = {
  id: 'yandex',
  async search({ query, limit, signal }) {
    const ctx = await newContext();
    const page = await ctx.newPage();

    try {
      const url = `https://yandex.com/search/?text=${encodeURIComponent(query)}`;
      await gotoWithRetries(page, url, { signal });

      await page.waitForSelector('li.serp-item a.Link[href], div.serp-item a.Link[href]', { timeout: 15000 }).catch(() => {});

      const items = await page.$$eval('li.serp-item, div.serp-item', (nodes: Element[]) =>
        nodes.map((n) => {
          const a = n.querySelector('a.Link[href]') as HTMLAnchorElement | null;
          const titleEl = n.querySelector('h2') as HTMLElement | null;
          const s = n.querySelector('.OrganicTextContentSpan, .text-container') as HTMLElement | null;
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
        results.push({ engine: 'yandex', title: it.title, url: it.url, snippet: it.snippet || undefined });
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
