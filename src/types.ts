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

export interface ImageResult {
  engine: string;
  title: string;
  url: string;
  thumbnail: string;
  width?: number;
  height?: number;
  source?: string;
}

export interface VideoResult {
  engine: string;
  title: string;
  url: string;
  thumbnail: string;
  duration?: string;
  views?: string;
  channel?: string;
  uploadDate?: string;
}

export interface NewsResult {
  engine: string;
  title: string;
  url: string;
  source: string;
  publishDate?: string;
  snippet?: string;
  imageUrl?: string;
}

