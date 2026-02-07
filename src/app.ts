import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { metaSearch, parseEnginesParam } from './searchService.js';
import { engines } from './engines/index.js';
import { imageSearch } from './imageSearchService.js';
import { videoSearch } from './videoSearchService.js';
import { newsSearch } from './newsSearchService.js';

import type { Request, Response } from 'express';

export const app = express();
app.use(cors());

app.get('/images', (_req: Request, res: Response) => {
  const port = Number(process.env.PORT ?? 8787);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="tr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>🖼️ Görsel Arama Testi</title>
    <style>
      * { box-sizing: border-box; }
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; background: linear-gradient(135deg, #0a0e1a 0%, #1a1f35 100%); color: #e8eefc; min-height: 100vh; }
      header { padding: 24px 32px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.02); backdrop-filter: blur(10px); }
      h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px; background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
      .sub { margin-top: 8px; color: rgba(232,238,252,0.6); font-size: 14px; }
      .sub a { color: #60a5fa; text-decoration: none; transition: color 0.2s; }
      .sub a:hover { color: #93c5fd; text-decoration: underline; }
      main { padding: 24px 32px; max-width: 1400px; margin: 0 auto; }
      .controls { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 16px; padding: 24px; margin-bottom: 24px; }
      .control-row { display: grid; grid-template-columns: 1fr 200px; gap: 16px; margin-bottom: 16px; }
      @media (max-width: 768px) { .control-row { grid-template-columns: 1fr; } }
      label { display: block; font-size: 13px; font-weight: 600; color: rgba(232,238,252,0.8); margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
      input { border: 1px solid rgba(255,255,255,0.15); background: rgba(0,0,0,0.3); color: #e8eefc; padding: 12px 16px; border-radius: 10px; width: 100%; font-size: 15px; transition: all 0.2s; }
      input:focus { outline: none; border-color: #60a5fa; background: rgba(0,0,0,0.4); box-shadow: 0 0 0 3px rgba(96,165,250,0.1); }
      button { cursor: pointer; border: none; background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: white; padding: 12px 24px; border-radius: 10px; font-size: 15px; font-weight: 600; transition: all 0.2s; box-shadow: 0 4px 12px rgba(59,130,246,0.3); }
      button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(59,130,246,0.4); }
      button:active { transform: translateY(0); }
      button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
      .stats { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
      .stat { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px 20px; flex: 1; min-width: 150px; }
      .stat-label { font-size: 12px; color: rgba(232,238,252,0.6); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
      .stat-value { font-size: 24px; font-weight: 700; color: #60a5fa; }
      .results-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 20px; }
      .image-card { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; transition: all 0.3s; cursor: pointer; }
      .image-card:hover { transform: translateY(-4px); box-shadow: 0 8px 24px rgba(0,0,0,0.3); border-color: rgba(96,165,250,0.5); }
      .image-wrapper { width: 100%; height: 200px; background: rgba(0,0,0,0.3); position: relative; overflow: hidden; }
      .image-wrapper img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s; }
      .image-card:hover .image-wrapper img { transform: scale(1.05); }
      .image-info { padding: 16px; }
      .image-title { font-size: 14px; font-weight: 600; color: #e8eefc; margin-bottom: 8px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; line-height: 1.4; }
      .image-meta { display: flex; gap: 12px; font-size: 12px; color: rgba(232,238,252,0.5); margin-top: 8px; }
      .image-meta span { display: flex; align-items: center; gap: 4px; }
      .source-badge { display: inline-block; background: rgba(96,165,250,0.2); color: #60a5fa; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 600; margin-top: 8px; }
      .loading { text-align: center; padding: 60px 20px; color: rgba(232,238,252,0.6); }
      .loading-spinner { width: 40px; height: 40px; border: 3px solid rgba(96,165,250,0.2); border-top-color: #60a5fa; border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 16px; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .empty { text-align: center; padding: 60px 20px; color: rgba(232,238,252,0.4); }
      .error { background: rgba(239,68,68,0.1); border: 1px solid rgba(239,68,68,0.3); border-radius: 12px; padding: 16px; color: #fca5a5; margin-bottom: 24px; }
      .json-toggle { background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 16px; margin-top: 24px; }
      .json-toggle summary { cursor: pointer; font-weight: 600; color: rgba(232,238,252,0.8); user-select: none; }
      .json-toggle pre { margin-top: 12px; padding: 16px; background: rgba(0,0,0,0.3); border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.6; }
    </style>
  </head>
  <body>
    <header>
      <h1>🖼️ Görsel Arama Testi</h1>
      <div class="sub">
        <a href="/">Ana Sayfa</a> • 
        <a href="/videos">Video Arama</a> • 
        <a href="/news">Haber Arama</a> • 
        <a href="/status">Durum</a>
      </div>
    </header>
    <main>
      <div class="controls">
        <div class="control-row">
          <div>
            <label for="q">Arama Sorgusu</label>
            <input id="q" value="cats" placeholder="Aramak istediğiniz kelimeyi girin..." />
          </div>
          <div>
            <label for="limit">Sonuç Limiti (max 200)</label>
            <input id="limit" value="50" type="number" min="1" max="200" />
          </div>
        </div>
        <button id="runTest">🔍 Arama Yap</button>
      </div>

      <div id="error" class="error" style="display: none;"></div>

      <div class="stats" id="stats" style="display: none;">
        <div class="stat">
          <div class="stat-label">Toplam Sonuç</div>
          <div class="stat-value" id="count">0</div>
        </div>
        <div class="stat">
          <div class="stat-label">Sorgu</div>
          <div class="stat-value" id="query" style="font-size: 18px; color: #a78bfa;">-</div>
        </div>
        <div class="stat">
          <div class="stat-label">Yanıt Süresi</div>
          <div class="stat-value" id="time" style="font-size: 18px; color: #34d399;">-</div>
        </div>
      </div>

      <div id="loading" class="loading" style="display: none;">
        <div class="loading-spinner"></div>
        <div>Görsel aranıyor...</div>
      </div>

      <div id="results" class="results-grid"></div>

      <details class="json-toggle" id="jsonToggle" style="display: none;">
        <summary>📋 Ham JSON Verisi</summary>
        <pre id="jsonData"></pre>
      </details>
    </main>
    <script>
      const el = (id) => document.getElementById(id);
      let currentData = null;

      el('runTest').addEventListener('click', async () => {
        const q = el('q').value.trim();
        const limit = parseInt(el('limit').value) || 50;
        
        if (!q) {
          el('error').textContent = '⚠️ Lütfen bir arama sorgusu girin!';
          el('error').style.display = 'block';
          return;
        }

        el('error').style.display = 'none';
        el('stats').style.display = 'none';
        el('results').innerHTML = '';
        el('jsonToggle').style.display = 'none';
        el('loading').style.display = 'block';
        el('runTest').disabled = true;

        const startTime = Date.now();
        const url = '/search/images?q=' + encodeURIComponent(q) + '&limitTotal=' + limit + '&cache=1';

        try {
          const r = await fetch(url);
          const j = await r.json();
          const duration = ((Date.now() - startTime) / 1000).toFixed(2);
          
          currentData = j;
          el('loading').style.display = 'none';
          
          if (j.results && j.results.length > 0) {
            el('stats').style.display = 'flex';
            el('count').textContent = j.count || j.results.length;
            el('query').textContent = j.query;
            el('time').textContent = duration + 's';

            j.results.forEach((img, idx) => {
              const card = document.createElement('div');
              card.className = 'image-card';
              card.innerHTML = \`
                <div class="image-wrapper">
                  <img src="\${img.thumbnail || img.url}" alt="\${img.title}" loading="lazy" 
                       onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22280%22 height=%22200%22%3E%3Crect fill=%22%23374151%22 width=%22280%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 fill=%22%239ca3af%22 text-anchor=%22middle%22 dy=%22.3em%22%3ENo Image%3C/text%3E%3C/svg%3E'" />
                </div>
                <div class="image-info">
                  <div class="image-title">\${img.title}</div>
                  <div class="image-meta">
                    \${img.width && img.height ? \`<span>📐 \${img.width}×\${img.height}</span>\` : ''}
                    <span>🔢 #\${idx + 1}</span>
                  </div>
                  \${img.source ? \`<div class="source-badge">\${img.source}</div>\` : ''}
                </div>
              \`;
              card.onclick = () => window.open(img.url, '_blank');
              el('results').appendChild(card);
            });

            el('jsonToggle').style.display = 'block';
            el('jsonData').textContent = JSON.stringify(j, null, 2);
          } else {
            el('results').innerHTML = '<div class="empty">😕 Sonuç bulunamadı. Farklı bir arama terimi deneyin.</div>';
          }
        } catch (e) {
          el('loading').style.display = 'none';
          el('error').textContent = '❌ Hata: ' + String(e);
          el('error').style.display = 'block';
        } finally {
          el('runTest').disabled = false;
        }
      });

      // Enter tuşu ile arama
      el('q').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') el('runTest').click();
      });
    </script>
  </body>
</html>`);
});

app.get('/videos', (_req: Request, res: Response) => {
  const port = Number(process.env.PORT ?? 8787);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Video Search Test</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; background: #0b1020; color: #e8eefc; }
      header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
      h1 { margin: 0; font-size: 18px; font-weight: 650; letter-spacing: 0.2px; }
      .sub { margin-top: 6px; color: rgba(232,238,252,0.72); font-size: 13px; }
      main { padding: 18px 24px 30px; max-width: 1100px; }
      .card { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.03); padding: 14px; margin-bottom: 12px; }
      label { display: block; font-size: 12px; color: rgba(232,238,252,0.75); margin-bottom: 6px; }
      input { border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.20); color: #e8eefc; padding: 8px 10px; border-radius: 10px; width: 100%; box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      button { cursor: pointer; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e8eefc; padding: 8px 10px; border-radius: 10px; }
      button:hover { background: rgba(255,255,255,0.09); }
      pre { margin: 0; padding: 12px; overflow: auto; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); max-height: 500px; }
      a { color: #9cc2ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .actions { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }
    </style>
  </head>
  <body>
    <header>
      <h1>🎥 Video Search Test</h1>
      <div class="sub">Running on <span>http://localhost:${port}</span> • <a href="/">Home</a> • <a href="/images">Images</a> • <a href="/news">News</a></div>
    </header>
    <main>
      <div class="card">
        <label for="q">Search query</label>
        <input id="q" value="typescript tutorial" />
        <label for="limit" style="margin-top: 10px;">Limit (max 100)</label>
        <input id="limit" value="30" type="number" />
        <div class="actions">
          <button id="runTest">Run /search/videos test</button>
        </div>
      </div>
      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: rgba(232,238,252,0.75); font-size: 13px;">Results</span>
          <span id="statusTime" style="color: rgba(232,238,252,0.75); font-size: 13px;">-</span>
        </div>
        <pre id="results">Click "Run test" to see results...</pre>
      </div>
    </main>
    <script>
      const el = (id) => document.getElementById(id);
      el('runTest').addEventListener('click', async () => {
        const q = encodeURIComponent(el('q').value || '');
        const limit = encodeURIComponent(el('limit').value || '30');
        const url = '/search/videos?q=' + q + '&limitTotal=' + limit + '&cache=1';
        try {
          el('results').textContent = 'Loading...';
          const r = await fetch(url);
          const j = await r.json();
          el('statusTime').textContent = new Date().toLocaleTimeString();
          el('results').textContent = JSON.stringify(j, null, 2);
        } catch (e) {
          el('results').textContent = String(e);
        }
      });
    </script>
  </body>
</html>`);
});

app.get('/news', (_req: Request, res: Response) => {
  const port = Number(process.env.PORT ?? 8787);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>News Search Test</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; background: #0b1020; color: #e8eefc; }
      header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
      h1 { margin: 0; font-size: 18px; font-weight: 650; letter-spacing: 0.2px; }
      .sub { margin-top: 6px; color: rgba(232,238,252,0.72); font-size: 13px; }
      main { padding: 18px 24px 30px; max-width: 1100px; }
      .card { border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.03); padding: 14px; margin-bottom: 12px; }
      label { display: block; font-size: 12px; color: rgba(232,238,252,0.75); margin-bottom: 6px; }
      input { border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.20); color: #e8eefc; padding: 8px 10px; border-radius: 10px; width: 100%; box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      button { cursor: pointer; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e8eefc; padding: 8px 10px; border-radius: 10px; }
      button:hover { background: rgba(255,255,255,0.09); }
      pre { margin: 0; padding: 12px; overflow: auto; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); max-height: 500px; }
      a { color: #9cc2ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .actions { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }
    </style>
  </head>
  <body>
    <header>
      <h1>📰 News Search Test</h1>
      <div class="sub">Running on <span>http://localhost:${port}</span> • <a href="/">Home</a> • <a href="/images">Images</a> • <a href="/videos">Videos</a></div>
    </header>
    <main>
      <div class="card">
        <label for="q">Search query</label>
        <input id="q" value="artificial intelligence" />
        <label for="limit" style="margin-top: 10px;">Limit (max 100)</label>
        <input id="limit" value="30" type="number" />
        <div class="actions">
          <button id="runTest">Run /search/news test</button>
        </div>
      </div>
      <div class="card">
        <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
          <span style="color: rgba(232,238,252,0.75); font-size: 13px;">Results</span>
          <span id="statusTime" style="color: rgba(232,238,252,0.75); font-size: 13px;">-</span>
        </div>
        <pre id="results">Click "Run test" to see results...</pre>
      </div>
    </main>
    <script>
      const el = (id) => document.getElementById(id);
      el('runTest').addEventListener('click', async () => {
        const q = encodeURIComponent(el('q').value || '');
        const limit = encodeURIComponent(el('limit').value || '30');
        const url = '/search/news?q=' + q + '&limitTotal=' + limit + '&cache=1';
        try {
          el('results').textContent = 'Loading...';
          const r = await fetch(url);
          const j = await r.json();
          el('statusTime').textContent = new Date().toLocaleTimeString();
          el('results').textContent = JSON.stringify(j, null, 2);
        } catch (e) {
          el('results').textContent = String(e);
        }
      });
    </script>
  </body>
</html>`);
});


app.get('/', (_req: Request, res: Response) => {
  const port = Number(process.env.PORT ?? 8787);
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Hybrid Proxy Status</title>
    <style>
      body { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial; margin: 0; background: #0b1020; color: #e8eefc; }
      header { padding: 20px 24px; border-bottom: 1px solid rgba(255,255,255,0.08); background: rgba(255,255,255,0.03); }
      h1 { margin: 0; font-size: 18px; font-weight: 650; letter-spacing: 0.2px; }
      .sub { margin-top: 6px; color: rgba(232,238,252,0.72); font-size: 13px; }
      main { padding: 18px 24px 30px; max-width: 1100px; }
      .grid { display: grid; grid-template-columns: repeat(12, 1fr); gap: 12px; }
      .card { grid-column: span 12; border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; background: rgba(255,255,255,0.03); padding: 14px; }
      @media (min-width: 900px) { .card.half { grid-column: span 6; } }
      .row { display: flex; justify-content: space-between; gap: 12px; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.06); }
      .row:last-child { border-bottom: none; }
      .k { color: rgba(232,238,252,0.75); font-size: 13px; }
      .v { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13px; color: #ffffff; text-align: right; }
      pre { margin: 0; padding: 12px; overflow: auto; background: rgba(0,0,0,0.25); border-radius: 10px; border: 1px solid rgba(255,255,255,0.08); }
      a { color: #9cc2ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      .badge { display: inline-flex; align-items: center; gap: 8px; padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,0.10); background: rgba(255,255,255,0.04); font-size: 12px; }
      .dot { width: 8px; height: 8px; border-radius: 999px; background: #ffd166; }
      .dot.ok { background: #46d39a; }
      .dot.err { background: #ff5c7a; }
      .actions { margin-top: 10px; display: flex; gap: 10px; flex-wrap: wrap; }
      button { cursor: pointer; border: 1px solid rgba(255,255,255,0.12); background: rgba(255,255,255,0.06); color: #e8eefc; padding: 8px 10px; border-radius: 10px; }
      button:hover { background: rgba(255,255,255,0.09); }
      input { border: 1px solid rgba(255,255,255,0.14); background: rgba(0,0,0,0.20); color: #e8eefc; padding: 8px 10px; border-radius: 10px; width: 100%; box-sizing: border-box; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
      label { display: block; font-size: 12px; color: rgba(232,238,252,0.75); margin-bottom: 6px; }
      .two { display: grid; grid-template-columns: 1fr; gap: 10px; }
      @media (min-width: 900px) { .two { grid-template-columns: 1fr 1fr; } }
    </style>
  </head>
  <body>
    <header>
      <h1>Hybrid Proxy Status</h1>
      <div class="sub">Running on <span class="v">http://localhost:${port}</span> • <a href="/status">/status</a> • <a href="/health">/health</a> • <a href="/images">Images</a> • <a href="/videos">Videos</a> • <a href="/news">News</a></div>
    </header>
    <main>
      <div class="grid">
        <section class="card half">
          <div class="row"><div class="k">Service</div><div class="v">proxy</div></div>
          <div class="row"><div class="k">Version</div><div class="v" id="ver">-</div></div>
          <div class="row"><div class="k">Uptime</div><div class="v" id="uptime">-</div></div>
          <div class="row"><div class="k">Engines</div><div class="v" id="engines">-</div></div>
          <div class="actions">
            <button id="refresh">Refresh</button>
          </div>
        </section>

        <section class="card half">
          <div class="badge" id="healthBadge"><span class="dot" id="healthDot"></span><span id="healthText">Checking /health...</span></div>
          <div style="height: 12px;"></div>
          <div class="two">
            <div>
              <label for="q">Quick search test (q)</label>
              <input id="q" value="artado" />
            </div>
            <div>
              <label for="eng">engines (comma)</label>
              <input id="eng" value="brave,startpage,qwant" />
            </div>
          </div>
          <div class="actions">
            <button id="runTest">Run /search test</button>
            <a class="badge" href="#" id="openSearch" style="border-radius: 10px;"><span class="dot ok"></span><span>Open /search</span></a>
          </div>
        </section>

        <section class="card">
          <div class="row"><div class="k">/status JSON</div><div class="v" id="statusTime">-</div></div>
          <pre id="status">Loading...</pre>
        </section>
      </div>
    </main>
    <script>
      const el = (id) => document.getElementById(id);
      const fmtBytes = (n) => {
        if (!Number.isFinite(n)) return String(n);
        const u = ['B','KB','MB','GB'];
        let i = 0; let v = n;
        while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
        return v.toFixed(v >= 10 || i === 0 ? 0 : 1) + ' ' + u[i];
      };

      async function load() {
        try {
          const statusRes = await fetch('/status');
          const status = await statusRes.json();
          el('ver').textContent = status?.runtime?.node ?? '-';
          el('uptime').textContent = status?.runtime?.uptimeSec != null ? String(status.runtime.uptimeSec) + 's' : '-';
          el('engines').textContent = Array.isArray(status?.engines?.supported) ? status.engines.supported.join(', ') : '-';
          el('statusTime').textContent = new Date().toLocaleTimeString();
          el('status').textContent = JSON.stringify(status, null, 2);

          const healthRes = await fetch('/health');
          const healthOk = healthRes.ok;
          el('healthDot').className = 'dot ' + (healthOk ? 'ok' : 'err');
          el('healthText').textContent = healthOk ? 'Healthy' : 'Unhealthy (' + String(healthRes.status) + ')';
        } catch (e) {
          el('healthDot').className = 'dot err';
          el('healthText').textContent = 'Failed to load status';
          el('status').textContent = String(e);
        }
      }

      el('refresh').addEventListener('click', load);

      function syncOpenSearchLink() {
        const q = encodeURIComponent(el('q').value || '');
        const engines = encodeURIComponent(el('eng').value || '');
        const url = '/search?q=' + q + '&engines=' + engines + '&limitTotal=20&limitPerEngine=5&timeoutMs=20000&cache=1';
        el('openSearch').setAttribute('href', url);
      }

      el('q').addEventListener('input', syncOpenSearchLink);
      el('eng').addEventListener('input', syncOpenSearchLink);
      syncOpenSearchLink();

      el('runTest').addEventListener('click', async () => {
        syncOpenSearchLink();
        const href = el('openSearch').getAttribute('href');
        try {
          const r = await fetch(href);
          const j = await r.json();
          alert('ok=' + String(r.ok) + ' status=' + String(r.status) + ' results=' + String(Array.isArray(j?.results) ? j.results.length : 0));
        } catch (e) {
          alert(String(e));
        }
      });

      load();
    </script>
  </body>
</html>`);
});

app.get('/status', (_req: Request, res: Response) => {
  const supported = engines.map((e) => e.id);
  const mem = process.memoryUsage();
  res.json({
    ok: true,
    service: 'proxy',
    now: new Date().toISOString(),
    runtime: {
      node: process.version,
      pid: process.pid,
      platform: process.platform,
      arch: process.arch,
      uptimeSec: Math.floor(process.uptime())
    },
    engines: {
      supported
    },
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external
    }
  });
});

app.get('/health', (_req: Request, res: Response) => {
  res.json({ ok: true });
});

app.get('/search', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const engines = parseEnginesParam(typeof req.query.engines === 'string' ? req.query.engines : undefined);
  const limitTotal = Math.max(1, Math.min(200, Number(req.query.limitTotal ?? 20)));
  const limitPerEngine = Math.max(1, Math.min(20, Number(req.query.limitPerEngine ?? 5)));
  const useCache = !(String(req.query.cache ?? '1') === '0');
  const region = typeof req.query.region === 'string' ? req.query.region.trim() : undefined;
  const includeDomains = typeof req.query.includeDomains === 'string' ? req.query.includeDomains : undefined;
  const excludeDomains = typeof req.query.excludeDomains === 'string' ? req.query.excludeDomains : undefined;

  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(3000, Math.min(30000, Number(req.query.timeoutMs ?? 12000)));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { results, errors } = await metaSearch({
      query: q,
      engines,
      limitPerEngine,
      limitTotal,
      includeDomains,
      excludeDomains,
      useCache,
      signal: controller.signal,
      region
    });
    res.json({
      query: q,
      engines,
      limitTotal,
      limitPerEngine,
      count: results.length,
      results,
      errors
    });
  } finally {
    clearTimeout(t);
  }
});

app.get('/search/images', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limitTotal = Math.max(1, Math.min(200, Number(req.query.limitTotal ?? 50)));
  const useCache = !(String(req.query.cache ?? '1') === '0');

  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(3000, Math.min(30000, Number(req.query.timeoutMs ?? 12000)));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { results } = await imageSearch({
      query: q,
      limitTotal,
      useCache,
      signal: controller.signal
    });
    res.json({
      query: q,
      count: results.length,
      results
    });
  } finally {
    clearTimeout(t);
  }
});

app.get('/search/videos', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limitTotal = Math.max(1, Math.min(100, Number(req.query.limitTotal ?? 30)));
  const useCache = !(String(req.query.cache ?? '1') === '0');

  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(3000, Math.min(30000, Number(req.query.timeoutMs ?? 12000)));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { results } = await videoSearch({
      query: q,
      limitTotal,
      useCache,
      signal: controller.signal
    });
    res.json({
      query: q,
      count: results.length,
      results
    });
  } finally {
    clearTimeout(t);
  }
});

app.get('/search/news', async (req: Request, res: Response) => {
  const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
  const limitTotal = Math.max(1, Math.min(100, Number(req.query.limitTotal ?? 30)));
  const useCache = !(String(req.query.cache ?? '1') === '0');

  if (!q) {
    res.status(400).json({ error: 'missing q' });
    return;
  }

  const controller = new AbortController();
  const timeoutMs = Math.max(3000, Math.min(30000, Number(req.query.timeoutMs ?? 12000)));
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const { results } = await newsSearch({
      query: q,
      limitTotal,
      useCache,
      signal: controller.signal
    });
    res.json({
      query: q,
      count: results.length,
      results
    });
  } finally {
    clearTimeout(t);
  }
});

