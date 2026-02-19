import { loadHtml } from '../html/load.js';
import type { SearchResult } from '../types.js';
import type { Engine } from './engine.js';

export const google: Engine = {
  id: 'google',
  async search({ query, limit, pageno = 1, signal }) {
    const start = (pageno - 1) * 10;
    
    // STRATEJİ: Google'ın "Uygulama İçi Browser" (In-App) görünümünü taklit ediyoruz.
    // Bu görünümde Captcha çıkma olasılığı çok daha düşüktür.
    const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&start=${start}&num=${limit}&client=safari&sca_esv=1&hl=tr&gl=tr&iflsig=AL9hS6EAAAAAZZgO...`;

    const res = await fetch(url, {
      headers: {
        // En kritik nokta: Google'ın botları en az şüphelendiği "iPhone Safari" User-Agent'ı
        'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8',
        'Referer': 'https://www.google.com/',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'same-origin'
      },
      signal
    });

    const html = await res.text();
    const $ = loadHtml(html);
    const out: SearchResult[] = [];

    // ÇOK KATMANLI SEÇİCİLER (Google'ın hem Masaüstü hem Mobil hem Lite sürümlerini tarar)
    // 1. Standart sonuçlar (.g), 2. Mobil sonuçlar (.xpd), 3. Alternatifler (.tF2Cxc)
    $('.g, .xpd, .tF2Cxc, .MjjYq').each((_, el) => {
      if (out.length >= limit) return;

      // Başlık: Mobil ve masaüstünde farklı sınıflarda olabilir
      const title = $(el).find('h3, .vv77S, .VwiC3b').first().text().trim();
      
      // URL: Bazı sürümlerde doğrudan link, bazılarında yönlendirme
      let rawUrl = $(el).find('a').first().attr('href') || '';
      
      if (rawUrl.startsWith('/url?q=')) {
        rawUrl = new URL(rawUrl, 'https://www.google.com').searchParams.get('q') || rawUrl;
      }

      // Snippet: En değişken kısım burasıdır
      const snippet = $(el).find('.VwiC3b, .BNeawe, .yXK7S, .MUFPAc').text().trim();

      if (title && rawUrl && rawUrl.startsWith('http') && !rawUrl.includes('google.com')) {
        out.push({
          engine: 'google',
          title,
          url: rawUrl,
          snippet: snippet || undefined
        });
      }
    });

    // --- GELİŞMİŞ HATA ANALİZİ ---
    if (out.length === 0) {
      const lowerHtml = html.toLowerCase();
      
      // Bloklanıp bloklanmadığımızı anlamak için HTML'i analiz et
      if (lowerHtml.includes('captcha') || lowerHtml.includes('/sorry/') || res.status === 429) {
        throw new Error(`blocked_or_captcha status=${res.status} url="google"`);
      }

      // Eğer bloklanmadıysak ama sonuç yoksa, Google bize "Anasayfa"yı veya "Boş Arama"yı itelemiş olabilir.
      // Bu durumda DuckDuckGo sonuçlarını Google formatında döndüren bir 'Fallback' tetiklenebilir.
      console.error(`Google Scraping Failed. HTML Length: ${html.length}. First 200 chars: ${html.slice(0, 200)}`);
      throw new Error(`no_results_or_selector_mismatch status=${res.status} url="google"`);
    }

    return out;
  }
};
