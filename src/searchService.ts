import { LRUCache } from 'lru-cache';
import pLimit from 'p-limit';
import type { Engine, EngineSearchParams } from './engines/engine.js';
import type { EngineError, SearchEngineId, SearchResult } from './types.js';
import { engines } from './engines/index.js';

const engineMap = new Map<SearchEngineId, Engine>(engines.map((e) => [e.id, e]));
const defaultEngines: SearchEngineId[] = engines
  .map((e) => e.id)
  .filter((id) => id !== 'yandex' && id !== 'duckduckgo');

function parseDomainList(raw?: string): Set<string> {
  if (!raw) return new Set();
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
    .map((d) => d.replace(/^\*\./, ''));
  return new Set(parts);
}

function getHostname(url: string): string {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return '';
  }
}

function normalizeUrlForDedupe(url: string): string {
  try {
    const u = new URL(url);
    u.hash = '';
    u.search = '';
    u.hostname = u.hostname.toLowerCase().replace(/^www\./, '');
    return `${u.protocol}//${u.hostname}${u.pathname}`.replace(/\/$/, '');
  } catch {
    return url;
  }
}

function matchesDomain(set: Set<string>, host: string): boolean {
  if (set.size === 0) return false;
  if (set.has(host)) return true;
  const parts = host.split('.');
  for (let i = 1; i < parts.length - 1; i++) {
    const parent = parts.slice(i).join('.');
    if (set.has(parent)) return true;
  }
  return false;
}

const engineWeight: Record<SearchEngineId, number> = {
  duckduckgo: 1.0,
  brave: 0.95,
  startpage: 0.9,
  qwant: 0.85,
  ecosia: 0.8,
  mojeek: 0.75,
  yahoo: 0.7,
  aol: 0.65,
  ask: 0.6,
  yandex: 0.4
};

const cache = new LRUCache<string, { results: SearchResult[]; errors: EngineError[] }>({
  max: 500,
  ttl: 60_000
});

const perEngineLimit = new Map<SearchEngineId, ReturnType<typeof pLimit>>(
  engines.map((e) => [e.id, pLimit(1)])
);

export function parseEnginesParam(raw?: string): SearchEngineId[] {
  if (!raw) return defaultEngines;
  const parts = raw
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean) as SearchEngineId[];

  const uniq = Array.from(new Set(parts));
  return uniq.filter((id) => engineMap.has(id));
}

export async function metaSearch(params: {
  query: string;
  engines: SearchEngineId[];
  limitPerEngine: number;
  limitTotal?: number;
  includeDomains?: string;
  excludeDomains?: string;
  useCache?: boolean;
  signal?: AbortSignal;
}): Promise<{ results: SearchResult[]; errors: EngineError[] }> {
  const limitTotal = Math.max(1, Math.min(100, params.limitTotal ?? 20));
  const key = `${params.query}::${params.engines.join(',')}::${params.limitPerEngine}::${limitTotal}::${params.includeDomains ?? ''}::${params.excludeDomains ?? ''}`;
  const useCache = params.useCache ?? true;
  if (useCache) {
    const cached = cache.get(key);
    if (cached) return cached;
  }

  const errors: EngineError[] = [];

  type Scored = SearchResult & { _score: number; _pos: number };

  const tasks = params.engines.map(async (engineId) => {
    const engine = engineMap.get(engineId);
    if (!engine) return [];

    const limiter = perEngineLimit.get(engineId) ?? pLimit(1);
    return limiter(async () => {
      const p: EngineSearchParams = {
        query: params.query,
        limit: params.limitPerEngine,
        signal: params.signal
      };

      try {
        const out = await engine.search(p);
        return out.map((r, idx) => ({ ...r, _pos: idx, _score: (engineWeight[engineId] ?? 0.5) / (1 + idx) }));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'engine error';
        errors.push({ engine: engineId, message: msg });
        return [];
      }
    });
  });

  const chunks = await Promise.all(tasks);
  const scored = chunks.flat() as Scored[];

  const include = parseDomainList(params.includeDomains);
  const exclude = parseDomainList(params.excludeDomains);

  const filtered: Scored[] = [];
  for (const r of scored) {
    const host = getHostname(r.url);
    if (!host) continue;
    if (matchesDomain(exclude, host)) continue;
    if (include.size > 0 && !matchesDomain(include, host)) continue;
    filtered.push(r);
  }

  const deduped = new Map<string, Scored>();
  for (const r of filtered) {
    const key = normalizeUrlForDedupe(r.url);
    const prev = deduped.get(key);
    if (!prev || r._score > prev._score) deduped.set(key, r);
  }

  const results = Array.from(deduped.values())
    .sort((a, b) => b._score - a._score)
    .slice(0, limitTotal)
    .map(({ _score: _s, _pos: _p, ...rest }) => rest);

  const payload = { results, errors };
  if (useCache) cache.set(key, payload);
  return payload;
}
