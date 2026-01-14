import express from 'express';
import cors from 'cors';
import 'dotenv/config';
import { metaSearch, parseEnginesParam } from './searchService.js';
import { engines } from './engines/index.js';

import type { Request, Response } from 'express';

export const app = express();
app.use(cors());

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
      <div class="sub">Running on <span class="v">http://localhost:${port}</span> • <a href="/status">/status</a> • <a href="/health">/health</a></div>
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
  const limitTotal = Math.max(1, Math.min(100, Number(req.query.limitTotal ?? 20)));
  const limitPerEngine = Math.max(1, Math.min(20, Number(req.query.limitPerEngine ?? 5)));
  const useCache = !(String(req.query.cache ?? '1') === '0');
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
      signal: controller.signal
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
