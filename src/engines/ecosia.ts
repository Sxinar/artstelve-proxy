import type { Engine } from './engine.js';
import type { SearchResult } from '../types.js';
import { fetchHtml } from '../http/fetchHtml.js';
import { loadHtml } from '../html/load.js';
import type { AnyNode } from 'domhandler';

export const ecosia: Engine = {
  id: 'ecosia',
  async search({ query, limit, signal }) {
    const reqUrl = `https://www.ecosia.org/search?q=${encodeURIComponent(query)}`;
    const { html } = await fetchHtml(reqUrl, { signal, timeoutMs: 20000 });
    const $ = loadHtml(html);

    const results: SearchResult[] = [];
    $('article.result, .result')
      .toArray()
      .some((el: AnyNode) => {
        const n = $(el);
        const a = n.find('a.result-title, a[href]').first();
        const title = (a.text() || '').trim();
        const url = (a.attr('href') || '').trim();
        const snippet = (n.find('.result-snippet, p').first().text() || '').trim();
        if (!title || !url) return false;
        results.push({ engine: 'ecosia', title, url, snippet: snippet || undefined });
        return results.length >= limit;
      });

    return results;
  }
};
