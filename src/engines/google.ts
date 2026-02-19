import { loadHtml } from '../html/load.js';
import type { SearchResult } from '../types.js';
import type { Engine } from './engine.js';

export const google: Engine = {
  id: 'google',
  async search({ query, limit, pageno = 1, signal }) {
    const start = (pageno - 1) * 10;
    
    // gbv=1: Google'ın JavaScript gerektirmeyen hafif sürümünü zorlar.
    // Bot koruması bu modda çok daha zayıftır.
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}&gbv=1&num=${limit}`;

    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      signal
    });

    const html = await res.text();
    const $ = loadHtml(html);
    const out: SearchResult[] = [];

    // LITE MOD SEÇİCİLERİ: Google Lite modunda 'div.g' yerine farklı yapılar kullanabilir.
    // Bu seçiciler hem standart hem lite modu kapsar.
    $('div.g, div.ZINbP, div.v7W49e').each((_, el) => {
      if (out.length >= limit) return;

      // Başlık ve Link genellikle h3 içindeki a etiketindedir
      const titleEl = $(el).find('h3');
      const linkEl = $(el).find('a').first();
      
      let title = titleEl.text().trim();
      let rawUrl = linkEl.attr('href') || '';

      // Google Lite modunda linkler genellikle /url?q= ile başlar
      if (rawUrl.startsWith('/url?q=')) {
          const urlObj = new URL(rawUrl, 'https://www.google.com');
          rawUrl = urlObj.searchParams.get('q') || rawUrl;
      }

      // Snippet: Google Lite modunda genellikle .VwiC3b yerine .BNeawe sınıfı kullanılır
      const snippet = $(el).find('.VwiC3b, .BNeawe, .st, .MUFPAc').text().trim();

      if (title && rawUrl && rawUrl.startsWith('http')) {
        out.push({
          engine: 'google',
          title,
          url: rawUrl,
          snippet: snippet || undefined
        });
      }
    });

    // --- KRİTİK HATA KONTROLÜ ---
    if (out.length === 0) {
      const hay = html.toLowerCase();
      if (hay.includes('captcha') || hay.includes('/sorry/') || res.status === 429) {
        throw new Error(`blocked_or_captcha status=${res.status} url="google"`);
      }
      
      // Eğer hala sonuç yoksa, HTML'den bir parça loglayalım (Debug için)
      console.log("HTML Snippet:", html.slice(0, 500)); 
      throw new Error(`no_results_or_selector_mismatch status=${res.status} url="google"`);
    }

    return out;
  }
};
