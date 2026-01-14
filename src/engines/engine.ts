import type { SearchEngineId, SearchResult } from '../types.js';

export type EngineSearchParams = {
  query: string;
  limit: number;
  signal?: AbortSignal;
};

export type Engine = {
  id: SearchEngineId;
  search: (params: EngineSearchParams) => Promise<SearchResult[]>;
};
