export type SearchEngineId =
  | 'duckduckgo'
  | 'google'
  | 'yahoo'
  | 'brave'
  | 'startpage'
  | 'qwant'
  | 'ecosia'
  | 'mojeek'
  | 'ask'
  | 'aol';

export type SearchResult = {
  engine: SearchEngineId;
  title: string;
  url: string;
  snippet?: string;
};

export type EngineError = {
  engine: SearchEngineId;
  message: string;
};
