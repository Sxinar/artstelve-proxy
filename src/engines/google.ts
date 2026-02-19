import { loadHtml } from '../html/load.js';
import type { SearchResult } from '../types.js';
import type { Engine } from './engine.js';

/**
 * Google yönlendirme linklerini ( /url?q=... ) temizler
 */
function cleanGoogleRedirect(href: string): string {
  try {
    if (!href) return '';
    if (href.startsWith('/url?')) {
      const u = new URL(href, 'https://www.google.com');
      return u.searchParams.get('q') || u.searchParams.get('url') || '';
    }
    return href.startsWith('http') ? href : '';
  } catch {
    return '';
  }
}

export const google: Engine = {
  id: 'google',
  async search({ query, limit, pageno = 1, signal }) {
    // Google start parametresi kullanır (0, 10, 20...)
    const start = (pageno - 1) * 10;
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}`;

    const res = await fetch(url, {
      headers: {
        // En kritik nokta: Modern ve gerçekçi bir User-Agent
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.google.com/'
      },
      signal
    });

    const html = await res.text();
    const $ = loadHtml(html);
    const out: SearchResult[] = [];

    // Google sonuçları genellikle 'g' class'ına sahip divler içindedir
    $('.g').each((_, el) => {
      if (out.length >= limit) return;

      const title = $(el).find('h3').text().trim();
      const rawUrl = $(el).find('a').attr('href') || '';
      const url = cleanGoogleRedirect(rawUrl);
      
      // Snippet (açıklama) kısmı genellikle VwiC3b gibi rastgele class'lardadır
      // Bu yüzden h3'ün altındaki en yakın metin bloğunu hedefliyoruz
      const snippet = $(el).find('.VwiC3b, .yXK7S, .st').text().trim();

      if (title && url && url !== '') {
        out.push({
          engine: 'google',
          title,
          url,
          snippet: snippet || undefined
        });
      }
    });

    // Projedeki bloklanma kontrolünü çalıştır
    // Eğer results 0 ise ve HTML içinde "captcha" geçiyorsa hata fırlatır
    const status = res.status;
    if (out.length === 0) {
      // Senin projedeki assert mekanizmasını burada tetikliyoruz
      const hay = `${url}\n${html}`.toLowerCase();
      const isBlocked = ['captcha', 'unusual traffic', '/sorry/'].some(h => hay.includes(h));
      
      if (isBlocked || status === 429) {
         throw new Error(`blocked_or_captcha status=${status} url="google"`);
      }
      throw new Error(`no_results_or_selector_mismatch status=${status} url="google"`);
    }

    return out;
  }
};
