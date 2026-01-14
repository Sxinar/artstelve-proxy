import type { Engine } from './engine.js';
import type { SearchResult } from '../types.js';
import { fetchHtml } from '../http/fetchHtml.js';
import { loadHtml } from '../html/load.js';
import type { AnyNode } from 'domhandler';

export const yahoo: Engine = {
  id: 'yahoo',
  async search({ query, limit, signal }) {
    const reqUrl = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}`;
    const { html } = await fetchHtml(reqUrl, { signal, timeoutMs: 20000 });
    const $ = loadHtml(html);

    const results: SearchResult[] = [];
    $('div#web li div.algo')
      .toArray()
      .some((el: AnyNode) => {
        const n = $(el);
        const a = n.find('h3.title a').first();
        const title = (a.text() || '').trim();
        const url = (a.attr('href') || '').trim();
        const snippet = (n.find('div.compText p').first().text() || '').trim();
        if (!title || !url) return false;
        results.push({ engine: 'yahoo', title, url, snippet: snippet || undefined });
        return results.length >= limit;
      });

    return results;
  }
};
