import type { Engine } from './engine.js';
import type { SearchResult } from '../types.js';
import { fetchHtml } from '../http/fetchHtml.js';
import { loadHtml } from '../html/load.js';
import type { AnyNode } from 'domhandler';

export const startpage: Engine = {
  id: 'startpage',
  async search({ query, limit, signal }) {
    const reqUrl = `https://www.startpage.com/sp/search?query=${encodeURIComponent(query)}`;
    const { html } = await fetchHtml(reqUrl, { signal, timeoutMs: 20000 });
    const $ = loadHtml(html);

    const results: SearchResult[] = [];
    $('div.w-gl__result, .w-gl__result')
      .toArray()
      .some((el: AnyNode) => {
        const n = $(el);
        const a = n.find('a.w-gl__result-title, a[href]').first();
        const title = (a.text() || '').trim();
        const url = (a.attr('href') || '').trim();
        const snippet = (n.find('.w-gl__description, p').first().text() || '').trim();
        if (!title || !url) return false;
        results.push({ engine: 'startpage', title, url, snippet: snippet || undefined });
        return results.length >= limit;
      });

    return results;
  }
};
